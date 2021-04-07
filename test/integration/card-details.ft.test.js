'use strict'

// NPM dependencies
const _ = require('lodash')
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
  postChargeRequest,
  defaultConnectorResponseForGetCharge,
  defaultAdminusersResponseForGetService,
  connectorResponseForPutCharge
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
  paymentProvider: 'sandbox',
  analyticsId: 'test-1234',
  type: 'test'
}

let mockServer

describe('Enter card details page tests', function () {
  const localServer = process.env.CONNECTOR_HOST

  const connectorChargePath = '/v1/frontend/charges/'
  const chargeId = '23144323'
  const frontendCardDetailsPostPath = '/card_details/' + chargeId
  const gatewayAccountId = gatewayAccount.gatewayAccountId

  const connectorAuthUrl = localServer + connectorChargePath + chargeId + '/cards'
  const enteringCardDetailsState = 'ENTERING CARD DETAILS'
  const RETURN_URL = 'http://www.example.com/service'

  function connectorExpects (data) {
    return mockServer.post(connectorChargePath + chargeId + '/cards', body => {
      // Strip non body data (header data) before comparing
      delete body.accept_header
      delete body.user_agent_header
      console.log('COMPARING: ')
      console.log(JSON.stringify(body))
      console.log('WITH: ')
      console.log(JSON.stringify(data))
      console.log('RETURNING: ' + _.isEqual(body, data))
      return _.isEqual(body, data)
    })
  }

  function minimumConnectorCardData (cardNumber, cardType = 'DEBIT', corporate = false, cardBrand = 'visa', prepaid = 'NOT_PREPAID') {
    return {
      card_number: cardNumber,
      cvc: '234',
      card_brand: cardBrand,
      expiry_date: '11/99',
      cardholder_name: 'Jimi Hendrix',
      card_type: cardType,
      corporate_card: corporate,
      prepaid: prepaid,
      address: {
        line1: '32 Whip Ma Whop Ma Avenue',
        city: 'Willy wonka',
        postcode: 'Y1 1YN',
        country: 'GB'
      },
      ip_address: '127.0.0.1'
    }
  }

  function minimumFormCardData (cardNumber) {
    return {
      returnUrl: RETURN_URL,
      cardUrl: connectorAuthUrl,
      chargeId: chargeId,
      cardNo: cardNumber,
      cvc: '234',
      expiryMonth: '11',
      expiryYear: '99',
      cardholderName: 'Jimi Hendrix',
      addressLine1: '32 Whip Ma Whop Ma Avenue',
      addressPostcode: 'Y1 1YN',
      addressCity: 'Willy wonka',
      email: 'willy@wonka.com',
      addressCountry: 'GB'
    }
  }

  beforeEach(function () {
    nock.cleanAll()
    mockServer = nock(localServer)
  })

  before(function () {
    // Disable logging.
    logger.level = 'none'
  })

  describe('The /card_details/charge_id endpoint', function () {
    it('It should show card details page if charge status is in "ENTERING CARD DETAILS" state', function (done) {
      const cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .put('/v1/frontend/charges/' + chargeId + '/status').reply(200)
        .get('/v1/frontend/charges/' + chargeId).reply(200, helper.rawSuccessfulGetCharge(enteringCardDetailsState, 'http://www.example.com/service', gatewayAccountId))
      defaultAdminusersResponseForGetService(gatewayAccountId)

      getChargeRequest(app, cookieValue, chargeId)
        .expect(200)
        .expect(function (res) {
          const $ = cheerio.load(res.text)
          expect($('#card-details #csrf').attr('value')).to.not.be.empty // eslint-disable-line
          expect($('#amount').text()).to.eql('£23.45')
          expect($('#payment-description').text()).to.contain('Payment Description')
          expect($('#card-details').attr('action')).to.eql(frontendCardDetailsPostPath)
          expect($('.withdrawal-text').text()).to.contains('Accepted credit and debit card types')
          expect($('#address-country').length).to.equal(1)
        })
        .end(done)
    })

    it('It should show card details page with correct text for credit card only', function (done) {
      const cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .put('/v1/frontend/charges/' + chargeId + '/status').reply(200)
        .get('/v1/frontend/charges/' + chargeId).reply(200, helper.rawSuccessfulGetChargeDebitCardOnly(enteringCardDetailsState, 'http://www.example.com/service', gatewayAccountId))
      defaultAdminusersResponseForGetService(gatewayAccountId)

      getChargeRequest(app, cookieValue, chargeId, '?debitOnly=true')
        .expect(200)
        .expect(function (res) {
          const $ = cheerio.load(res.text)
          expect($('.withdrawal-text').text()).to.contains('Credit card payments are not accepted. Please use a debit card.')
        })
        .end(done)
    })

    it('It should not show amex if it is excluded', function (done) {
      const cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .put('/v1/frontend/charges/' + chargeId + '/status').reply(200)
        .get('/v1/frontend/charges/' + chargeId).reply(200, helper.rawSuccessfulGetChargeDebitCardOnly(enteringCardDetailsState, 'http://www.example.com/service', gatewayAccountId))
      defaultAdminusersResponseForGetService(gatewayAccountId)

      getChargeRequest(app, cookieValue, chargeId, '?removeAmex=true')
        .expect(200)
        .expect(function (res) {
          expect(res.text).to.not.contain('american-express')
        })
        .end(done)
    })

    it('It should show 500 page if charge status cant be updated to "ENTERING CARD DETAILS" state with a 400 connector response', function (done) {
      const cookieValue = cookie.create(chargeId)
      connectorResponseForPutCharge(chargeId, 400, { message: 'some error' })

      getChargeRequest(app, cookieValue, chargeId)
        .expect(500)
        .end(done)
    })

    it('should fail to authorise when email patch fails', function (done) {
      const cookieValue = cookie.create(chargeId)
      nock.cleanAll()

      nock(process.env.CARDID_HOST)
        .post('/v1/api/card', () => {
          return true
        })
        .reply(200, { brand: 'visa', label: 'visa', type: 'D' })

      nock(process.env.CONNECTOR_HOST)
        .patch('/v1/frontend/charges/23144323')
        .reply(500)
      defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      connectorExpects(minimumConnectorCardData('5105105105105100'))
        .reply(200)

      postChargeRequest(app, cookieValue, minimumFormCardData('5105 1051 0510 5100'), chargeId, false)
        .expect(500)
        .end(done)
    })

    it('It should show 500 when email patch fails', function (done) {
      const cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .patch('/v1/frontend/charges/23144323')
        .reply(500)

      getChargeRequest(app, cookieValue, chargeId)
        .expect(500)
        .end(done)
    })
  })
})
