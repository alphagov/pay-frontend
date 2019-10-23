'use strict'

// NPM dependencies
const lodash = require('lodash')
const nock = require('nock')
const chai = require('chai')
const cheerio = require('cheerio')
const expect = chai.expect
const proxyquire = require('proxyquire')
const AWSXRay = require('aws-xray-sdk')

// Local dependencies
const logger = require('../../app/utils/logger')(__filename)
const cookie = require('../test_helpers/session')
const helper = require('../test_helpers/test_helpers')
const {
  getChargeRequest,
  postChargeRequest,
  defaultConnectorResponseForGetCharge,
  defaultAdminusersResponseForGetService
} = helper
const State = require('../../config/state')

// Constants
const app = proxyquire('../../server', {
  'aws-xray-sdk': {
    enableManualMode: () => {},
    setLogger: () => {},
    middleware: {
      setSamplingRules: () => {}
    },
    config: () => {},
    express: {
      openSegment: () => (req, res, next) => next(),
      closeSegment: () => (req, rest, next) => next()
    },
    captureAsyncFunc: (name, callback) => callback(new AWSXRay.Segment('stub-subsegment')),
    '@global': true
  },
  'continuation-local-storage': {
    getNamespace: function () {
      return {
        get: () => new AWSXRay.Segment('stub-segment'),
        bindEmitter: () => {},
        run: callback => callback(),
        set: () => {}
      }
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

const mockSuccessCardIdResponse = function (data) {
  nock(process.env.CARDID_HOST)
    .post('/v1/api/card', () => {
      return true
    })
    .reply(200, data)
}

describe('chargeTests - billing address', function () {
  const localServer = process.env.CONNECTOR_HOST

  const connectorChargePath = '/v1/frontend/charges/'
  const chargeId = '23144323'
  const frontendCardDetailsPath = '/card_details'
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
      console.log('RETURNING: ' + lodash.isEqual(body, data))
      return lodash.isEqual(body, data)
    })
  }

  function minimumConnectorCardData (cardNumber, cardType = 'DEBIT', corporate = false, cardBrand = 'visa') {
    return {
      card_number: cardNumber,
      cvc: '234',
      card_brand: cardBrand,
      expiry_date: '11/99',
      cardholder_name: 'Jimi Hendrix',
      card_type: cardType,
      corporate_card: corporate,
      address: {
        line1: '32 Whip Ma Whop Ma Avenue',
        city: 'Willy wonka',
        postcode: 'Y1 1YN',
        country: 'GB'
      }
    }
  }

  function connectorCardDataWithoutAddress (cardNumber, cardType = 'DEBIT', corporate = false, cardBrand = 'visa') {
    const connectorCardData = minimumConnectorCardData(cardNumber, cardType, corporate, cardBrand)
    delete connectorCardData.address
    return connectorCardData
  }

  function minimumFormCardData (cardNumber) {
    return {
      'returnUrl': RETURN_URL,
      'cardUrl': connectorAuthUrl,
      'chargeId': chargeId,
      'cardNo': cardNumber,
      'cvc': '234',
      'expiryMonth': '11',
      'expiryYear': '99',
      'cardholderName': 'Jimi Hendrix',
      'addressLine1': '32 Whip Ma Whop Ma Avenue',
      'addressPostcode': 'Y1 1YN',
      'addressCity': 'Willy wonka',
      'email': 'willy@wonka.com',
      'addressCountry': 'GB'
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

  describe('The /charge endpoint', function () {
    it('should not send address property to connector for services not wanting to capture it', function (done) {
      const cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .patch('/v1/frontend/charges/23144323')
        .reply(200)
      defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId, {
        collect_billing_address: false
      })
      mockSuccessCardIdResponse({ brand: 'visa', label: 'visa', type: 'D', corporate: true })

      connectorExpects(connectorCardDataWithoutAddress('4000180000000002', 'DEBIT', true, 'visa'))
        .reply(200, { status: State.AUTH_SUCCESS })

      postChargeRequest(app, cookieValue, minimumFormCardData('4000 1800 0000 0002'), chargeId)
        .expect(303)
        .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .end(done)
    })
  })

  describe('The /card_details/charge_id endpoint', function () {
    it('should not show billing address for services not wanting to capture it', function (done) {
      const cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .put('/v1/frontend/charges/' + chargeId + '/status').reply(200)
        .get('/v1/frontend/charges/' + chargeId).reply(200, helper.rawSuccessfulGetCharge(enteringCardDetailsState, 'http://www.example.com/service', gatewayAccountId))
      defaultAdminusersResponseForGetService(gatewayAccountId, {
        collect_billing_address: false
      })

      getChargeRequest(app, cookieValue, chargeId)
        .expect(200)
        .expect(function (res) {
          const $ = cheerio.load(res.text)
          expect($('#govuk-script-charge')[0].children[0].data).to.contains(chargeId)
          expect($('#card-details #csrf').attr('value')).to.not.be.empty // eslint-disable-line
          expect($('.payment-summary #amount').text()).to.eql('£23.45')
          expect($('.payment-summary #payment-description').text()).to.contain('Payment Description')
          expect($('#card-details').attr('action')).to.eql(frontendCardDetailsPostPath)
          expect($('.withdrawal-text').text()).to.contains('Accepted credit and debit card types')
          expect($('#address-country').length).to.equal(0)
        })
        .end(done)
    })
  })

  describe('The /card_details/charge_id/confirm endpoint', function () {
    it('should not show billing address for services not wanting to capture it', function (done) {
      nock(process.env.CONNECTOR_HOST)
        .get('/v1/frontend/charges/' + chargeId).reply(200, helper.rawSuccessfulGetCharge('AUTHORISATION SUCCESS', 'http://www.example.com/service', chargeId, gatewayAccountId, {}, null, true))
      defaultAdminusersResponseForGetService(gatewayAccountId, {
        collect_billing_address: false
      })
      const cookieValue = cookie.create(chargeId)

      getChargeRequest(app, cookieValue, chargeId, '/confirm')
        .expect(200)
        .expect(function (res) {
          const $ = cheerio.load(res.text)
          expect($('#confirmation #csrf').attr('value')).to.not.be.empty // eslint-disable-line
          expect($('#card-number').text()).to.contains('●●●●●●●●●●●●1234')
          expect($('#expiry-date').text()).to.contains('11/99')
          expect($('#cardholder-name').text()).to.contains('Test User')
          expect($('#address').length).to.equal(0)
          expect($('#amount').text()).to.eql('£23.45')
          expect($('#payment-description').text()).to.contain('Payment Description')
          expect($('#payment-summary-breakdown-amount').length > 0).to.equal(false)
          expect($('#payment-summary-corporate-card-fee').length > 0).to.equal(false)
        })
        .end(done)
    })
  })
})
