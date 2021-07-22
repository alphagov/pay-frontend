'use strict'

// NPM dependencies
const request = require('supertest')
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
  defaultConnectorResponseForGetCharge,
  defaultAdminusersResponseForGetService
} = helper
const State = require('../../config/state')

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

const gatewayAccount = {
  gatewayAccountId: '12345',
  analyticsId: 'test-1234',
  type: 'test'
}

let mockServer

describe('Confirm page tests', function () {
  const localServer = process.env.CONNECTOR_HOST
  const connectorChargePath = '/v1/frontend/charges/'
  const chargeId = '23144323'
  const frontendCardDetailsPath = '/card_details'
  const gatewayAccountId = gatewayAccount.gatewayAccountId

  beforeEach(function () {
    nock.cleanAll()
    mockServer = nock(localServer)
  })

  before(function () {
    // Disable logging.
    logger.level = 'none'
  })

  describe('The /card_details/charge_id/confirm endpoint', function () {
    beforeEach(function () {
      nock.cleanAll()
    })

    it('should return the data needed for the UI when there is no corporate card information', function (done) {
      nock(process.env.CONNECTOR_HOST)
        .get('/v1/frontend/charges/' + chargeId).reply(200, helper.rawSuccessfulGetCharge('AUTHORISATION SUCCESS', 'http://www.example.com/service', gatewayAccountId))
      defaultAdminusersResponseForGetService(gatewayAccountId)
      const cookieValue = cookie.create(chargeId)

      getChargeRequest(app, cookieValue, chargeId, '/confirm')
        .expect(200)
        .expect(function (res) {
          const $ = cheerio.load(res.text)
          expect($('#confirmation #csrf').attr('value')).to.not.be.empty // eslint-disable-line
          expect($('#card-number').text()).to.contains('●●●●●●●●●●●●1234')
          expect($('#expiry-date').text()).to.contains('11/99')
          expect($('#cardholder-name').text()).to.contains('Test User')
          expect($('#address').text()).to.contains('line1, line2, city, postcode, United Kingdom')
          expect($('#amount').text()).to.eql('£23.45')
          expect($('#payment-description').text()).to.contain('Payment Description')
          expect($('#payment-summary-breakdown-amount').length > 0).to.equal(false)
          expect($('#payment-summary-corporate-card-fee').length > 0).to.equal(false)
        })
        .end(done)
    })

    it('should return the data needed for the UI when there is corporate card information', function (done) {
      nock(process.env.CONNECTOR_HOST)
        .get('/v1/frontend/charges/' + chargeId).reply(200, helper.rawSuccessfulGetChargeCorporateCardOnly('AUTHORISATION SUCCESS', 'http://www.example.com/service', gatewayAccountId))
      defaultAdminusersResponseForGetService(gatewayAccountId)
      const cookieValue = cookie.create(chargeId)

      getChargeRequest(app, cookieValue, chargeId, '/confirm')
        .expect(200)
        .expect(function (res) {
          const $ = cheerio.load(res.text)
          expect($('#confirmation #csrf').attr('value')).to.not.be.empty // eslint-disable-line
          expect($('#card-number').text()).to.contains('●●●●●●●●●●●●1234')
          expect($('#expiry-date').text()).to.contains('11/99')
          expect($('#cardholder-name').text()).to.contains('Test User')
          expect($('#address').text()).to.contains('line1, line2, city, postcode, United Kingdom')
          expect($('#amount').text()).to.eql('£25.95')
          expect($('#payment-description').text()).to.contain('Payment Description')
          expect($('#payment-summary-breakdown-amount').text()).to.contain('£23.45')
          expect($('#payment-summary-corporate-card-fee').text()).to.contain('£2.50')
        })
        .end(done)
    })

    it('should post to the connector capture url looked up from the connector when a post arrives', function (done) {
      nock(process.env.CONNECTOR_HOST)
        .get('/v1/frontend/charges/' + chargeId).reply(200, helper.rawSuccessfulGetCharge(State.AUTH_SUCCESS, 'http://www.example.com/service', gatewayAccountId))
        .post('/v1/frontend/charges/' + chargeId + '/capture').reply(204)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      request(app)
        .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .send({ csrfToken: helper.csrfToken() })
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .set('Accept', 'application/json')
        .expect(303, {})
        .expect('Location', '/return/' + chargeId)
        .end(done)
    })

    it('should error if no csrf token', function (done) {
      nock(process.env.CONNECTOR_HOST)
        .get('/v1/frontend/charges/' + chargeId).reply(200, helper.rawSuccessfulGetCharge(State.AUTH_SUCCESS, 'http://www.example.com/service', gatewayAccountId))
        .post('/v1/frontend/charges/' + chargeId + '/capture').reply(200)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      request(app)
        .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .set('Accept', 'application/json')
        .expect(500)
        .end(done)
    })

    it('connector failure when trying to capture should result in error page', function (done) {
      nock(process.env.CONNECTOR_HOST)
        .get('/v1/frontend/charges/' + chargeId).reply(200, helper.rawSuccessfulGetCharge(State.AUTH_SUCCESS, 'http://www.example.com/service', gatewayAccountId))
        .post('/v1/frontend/charges/' + chargeId + '/capture').reply(500)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      request(app)
        .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .set('Cookie', ['frontend_state=' + cookie.createWithReturnUrl(chargeId, undefined, 'http://www.example.com/service')])
        .send({ csrfToken: helper.csrfToken() })
        .expect(500)
        .expect(function (res) {
          const $ = cheerio.load(res.text)
          expect($('#return-url').attr('href')).to.eql('/return/' + chargeId)
        })
        .end(done)
    })

    it('connector could not authorise capture results in error page', function (done) {
      nock(process.env.CONNECTOR_HOST)
        .get('/v1/frontend/charges/' + chargeId).reply(200, helper.rawSuccessfulGetCharge(State.AUTH_SUCCESS, 'http://www.example.com/service', gatewayAccountId))
        .post('/v1/frontend/charges/' + chargeId + '/capture').reply(400)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      request(app)
        .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .set('Cookie', ['frontend_state=' + cookie.createWithReturnUrl(chargeId, undefined, 'http://www.example.com/service')])
        .send({ csrfToken: helper.csrfToken() })
        .end(done)
    })

    it('should produce an error if the connector responds with a non 200', function (done) {
      mockServer.get(connectorChargePath + chargeId).reply(404)

      request(app)
        .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .send({ csrfToken: helper.csrfToken() })
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .set('Accept', 'application/json')
        .expect(500)
        .end(done)
    })

    it('should produce an error if the connector returns a non-200 status', function (done) {
      defaultConnectorResponseForGetCharge(chargeId, State.AUTH_SUCCESS, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)
      mockServer.post(connectorChargePath + chargeId + '/capture').reply(1234)

      request(app)
        .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .send({ csrfToken: helper.csrfToken() })
        .expect(500)
        .end(done)
    })

    it('should produce an error if the connector is unreachable for the confirm', function (done) {
      defaultConnectorResponseForGetCharge(chargeId, State.AUTH_SUCCESS, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      request(app)
        .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .send({ csrfToken: helper.csrfToken() })
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .expect(500)
        .end(done)
    })
  })
})
