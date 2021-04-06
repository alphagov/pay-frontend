'use strict'

// NPM dependencies
const _ = require('lodash')
const nock = require('nock')
const logger = require('../../app/utils/logger')(__filename)
const proxyquire = require('proxyquire')

// Local dependencies
const cookie = require('../test-helpers/session')
const helper = require('../test-helpers/test-helpers')
const {
  postChargeRequest,
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

const EMPTY_BODY = ''

const gatewayAccount = {
  gatewayAccountId: '12345',
  paymentProvider: 'sandbox',
  analyticsId: 'test-1234',
  type: 'test'
}

let mockServer

const defaultCardID = { brand: 'visa', label: 'visa', type: 'D', corporate: false, prepaid: 'NOT_PREPAID' }

const mockSuccessCardIdResponse = function (data) {
  nock(process.env.CARDID_HOST)
    .post('/v1/api/card', () => {
      return true
    })
    .reply(200, data)
}

describe('chargeTests', function () {
  const localServer = process.env.CONNECTOR_HOST

  const connectorChargePath = '/v1/frontend/charges/'
  const chargeId = '23144323'
  const frontendCardDetailsPath = '/card_details'
  const gatewayAccountId = gatewayAccount.gatewayAccountId

  const connectorAuthUrl = localServer + connectorChargePath + chargeId + '/cards'
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

  function fullConnectorCardData (cardNumber) {
    const cardData = minimumConnectorCardData(cardNumber)
    cardData.address.line2 = 'bla bla'
    cardData.address.city = 'London'
    cardData.address.country = 'GB'
    return cardData
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

  describe('Enter card details page — sending data to connector', function () {
    it('should send expected card data to connector for the case of a prepaid corporate debit card', function (done) {
      const cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .patch('/v1/frontend/charges/23144323')
        .reply(200)
      defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)
      mockSuccessCardIdResponse({ brand: 'visa', label: 'visa', type: 'D', corporate: true, prepaid: 'PREPAID' })

      connectorExpects(minimumConnectorCardData('4000180000000002', 'DEBIT', true, 'visa', 'PREPAID'))
        .reply(200, { status: State.AUTH_SUCCESS })

      postChargeRequest(app, cookieValue, minimumFormCardData('4000 1800 0000 0002'), chargeId)
        .expect(303)
        .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .end(done)
    })

    it('should send expected card data to connector for the case of a non-prepaid non-corporate credit card', function (done) {
      const cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .patch('/v1/frontend/charges/23144323')
        .reply(200)
      defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)
      mockSuccessCardIdResponse({ brand: 'american-express', label: 'american-express', type: 'C', corporate: false, prepaid: 'NOT_PREPAID' })

      connectorExpects(minimumConnectorCardData('4242424242424242', 'CREDIT', false, 'american-express'))
        .reply(200, { status: State.AUTH_SUCCESS })

      postChargeRequest(app, cookieValue, minimumFormCardData('4242 4242 4242 4242'), chargeId)
        .expect(303)
        .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .end(done)
    })

    it('should send card data including optional fields to connector', function (done) {
      const cookieValue = cookie.create(chargeId)
      mockSuccessCardIdResponse(defaultCardID)
      nock(process.env.CONNECTOR_HOST)
        .patch('/v1/frontend/charges/23144323')
        .reply(200)
      defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      const cardData = fullConnectorCardData('5105105105105100')

      connectorExpects(cardData).reply(200)

      const formData = minimumFormCardData('5105105105105100')
      formData.addressLine2 = cardData.address.line2
      formData.addressCity = cardData.address.city

      postChargeRequest(app, cookieValue, formData, chargeId)
        .expect(303)
        .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .end(done)
    })

    it('should ignore empty/null address lines when second address line populated', function (done) {
      const cookieValue = cookie.create(chargeId)
      mockSuccessCardIdResponse(defaultCardID)
      const cardData = minimumConnectorCardData('5105105105105100')
      cardData.address.line1 = 'bla bla'
      delete cardData.address.line3

      nock(process.env.CONNECTOR_HOST)
        .patch('/v1/frontend/charges/23144323')
        .reply(200)
      defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      connectorExpects(cardData).reply(200)
      const formData = minimumFormCardData('5105105105105100')
      formData.addressLine1 = ''
      formData.addressLine2 = cardData.address.line1

      postChargeRequest(app, cookieValue, formData, chargeId)
        .expect(303, EMPTY_BODY)
        .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .end(done)
    })

    it('should ignore empty/null address lines when only second address line populated', function (done) {
      const cookieValue = cookie.create(chargeId)
      mockSuccessCardIdResponse(defaultCardID)
      const cardData = minimumConnectorCardData('5105105105105100')
      cardData.address.line1 = 'bla bla'
      delete cardData.address.line2

      defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      connectorExpects(cardData).reply(200)
      nock(process.env.CONNECTOR_HOST)
        .patch('/v1/frontend/charges/23144323')
        .reply(200)
      const formData = minimumFormCardData('5105105105105100')
      formData.addressLine1 = ''
      formData.addressLine2 = cardData.address.line1

      postChargeRequest(app, cookieValue, formData, chargeId)
        .expect(303, EMPTY_BODY)
        .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .end(done)
    })
  })
})
