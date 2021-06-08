'use strict'

// NPM dependencies
const nock = require('nock')
const chai = require('chai')
const cheerio = require('cheerio')
const logger = require('../../app/utils/logger')(__filename)
const expect = chai.expect
const proxyquire = require('proxyquire')

// Local dependencies
const cookie = require('../test-helpers/session')
const helper = require('../test-helpers/test-helpers')
const {
  getChargeRequest,
  defaultAdminusersResponseForGetService
} = helper

// Constants
const app = proxyquire('../../server.js',
  {
    'memory-cache': {
      get: function () {
        return false
      },
      '@global': true
    }
  }).getApp()

const defaultCorrelationHeader = {
  reqheaders: { 'x-request-id': 'some-unique-id' }
}
const gatewayAccount = {
  gatewayAccountId: '12345',
  paymentProvider: 'sandbox',
  analyticsId: 'test-1234',
  type: 'test'
}

describe('chargeTests', function () {
  const chargeId = '23144323'
  const frontendCardDetailsPostPath = '/card_details/' + chargeId
  const gatewayAccountId = gatewayAccount.gatewayAccountId

  const enteringCardDetailsState = 'ENTERING CARD DETAILS'

  beforeEach(function () {
    nock.cleanAll()
  })

  before(function () {
    // Disable logging.
    logger.level = 'none'
  })

  describe('The /charge endpoint', function () {
    describe('Different statuses', function () {
      function get (status) {
        nock(process.env.CONNECTOR_HOST, defaultCorrelationHeader)
          .get('/v1/frontend/charges/23144323')
          .reply(200, {
            amount: 2345,
            description: 'Payment Description',
            status: status,
            return_url: 'http://www.example.com/service',
            payment_provider: 'sandbox',
            gateway_account: {
              gateway_account_id: gatewayAccountId,
              analytics_id: 'test-1234',
              type: 'test',
              payment_provider: 'sandbox',
              service_name: 'Pranks incorporated',
              card_types: [{
                type: 'CREDIT',
                brand: 'VISA',
                label: 'Visa'
              }]
            },
            service: {
              name: {
                en: 'Pranks incorporated'
              }
            }
          })

        nock(process.env.CONNECTOR_HOST, defaultCorrelationHeader)
          .put('/v1/frontend/charges/23144323/status')
          .reply(204)

        defaultAdminusersResponseForGetService(gatewayAccountId)

        const cookieValue = cookie.create(chargeId)
        return getChargeRequest(app, cookieValue, chargeId)
      }

      function getAndCheckChargeRequest (status, done) {
        get(status)
          .expect(200)
          .expect(function (res) {
            const $ = cheerio.load(res.text)
            expect($('#card-details #csrf').attr('value')).to.not.be.empty // eslint-disable-line
            expect($('#amount').text()).to.eql('£23.45')
            expect($('#payment-description').text()).to.contain('Payment Description')
            expect($('#govuk-script-analytics')[0].children[0].data).to.contains(`init('${gatewayAccount.analyticsId}', '${gatewayAccount.type}', '${gatewayAccount.paymentProvider}', '23.45', '')`)
            expect($('#card-details').attr('action')).to.eql(frontendCardDetailsPostPath)
          })
          .end(done)
      }

      it('should include the data required for the frontend when entering card details', function (done) {
        getAndCheckChargeRequest(enteringCardDetailsState, done)
      })

      it('should include the data required for the frontend when in created state', function (done) {
        getAndCheckChargeRequest('CREATED', done)
      })

      it('should show error page when the charge is not in a state we deal with', function (done) {
        get('invalid')
          .expect(500)
          .expect(function (res) {
            const $ = cheerio.load(res.text)
            expect($('#content #errorMsg').text()).to.eql('There is a problem, please try again later')
          }).end(done)
      })

      it('should show appropriate error page when the charge is in a state we deal with', function (done) {
        get('authorisation success')
          .expect(200)
          .end(done)
      })

      it('should show auth failure page when the authorisation has been rejected', function (done) {
        get('authorisation rejected')
          .expect(200)
          .end(done)
      })

      it('should show auth failure page when the authorisation has been cancelled', function (done) {
        get('authorisation cancelled')
          .expect(200)
          .end(done)
      })
    })
  })
})
