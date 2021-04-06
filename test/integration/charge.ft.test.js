'use strict'

// NPM dependencies
const _ = require('lodash')
const request = require('supertest')
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
const serviceFixtures = require('../fixtures/service-fixtures')

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
  const adminUsersHost = process.env.ADMINUSERS_URL

  const servicesResource = '/v1/api/services'
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

  describe('The /charge endpoint', function () {
    it('should redirect user to auth_waiting when connector returns 202', function (done) {
      const cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .patch('/v1/frontend/charges/23144323')
        .reply(200)
      defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      mockSuccessCardIdResponse(defaultCardID)

      connectorExpects(minimumConnectorCardData('4242424242424242'))
        .reply(202)

      postChargeRequest(app, cookieValue, minimumFormCardData('4242 4242 4242 4242'), chargeId)
        .expect(303)
        .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/auth_waiting')
        .end(done)
    })

    it('should redirect user to auth_waiting when connector returns 409', function (done) {
      const cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .patch('/v1/frontend/charges/23144323')
        .reply(200)
      defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      nock(adminUsersHost, defaultCorrelationHeader)
        .get(`${servicesResource}?gatewayAccountId=${gatewayAccountId}`)
        .reply(200, serviceFixtures.validServiceResponse({ gateway_account_ids: [gatewayAccountId] }).getPlain())

      mockSuccessCardIdResponse(defaultCardID)

      connectorExpects(minimumConnectorCardData('4242424242424242'))
        .reply(409)

      postChargeRequest(app, cookieValue, minimumFormCardData('4242 4242 4242 4242'), chargeId)
        .expect(303)
        .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/auth_waiting')
        .end(done)
    })

    it('should redirect user to confirm when connector returns 200 for authorisation success', function (done) {
      const cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .patch('/v1/frontend/charges/23144323')
        .reply(200)
      defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)
      mockSuccessCardIdResponse(defaultCardID)

      connectorExpects(minimumConnectorCardData('4242424242424242'))
        .reply(200, { status: State.AUTH_SUCCESS })

      postChargeRequest(app, cookieValue, minimumFormCardData('4242 4242 4242 4242'), chargeId)
        .expect(303)
        .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .end(done)
    })

    it('should redirect user to confirm when connector returns 200 for authorisation and 3DS is required', function (done) {
      const cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .patch('/v1/frontend/charges/23144323')
        .reply(200)
      defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)
      mockSuccessCardIdResponse(defaultCardID)

      connectorExpects(minimumConnectorCardData('4242424242424242'))
        .reply(200, { status: State.AUTH_3DS_REQUIRED })

      postChargeRequest(app, cookieValue, minimumFormCardData('4242 4242 4242 4242'), chargeId)
        .expect(303)
        .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/3ds_required')
        .end(done)
    })

    it('should redirect user from /auth_waiting to /confirm when connector returns a successful status', function (done) {
      const cookieValue = cookie.create(chargeId)
      defaultConnectorResponseForGetCharge(chargeId, State.AUTH_SUCCESS, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      request(app)
        .get(frontendCardDetailsPath + '/' + chargeId + '/auth_waiting')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Cookie', ['frontend_state=' + cookieValue])
        .set('Accept', 'application/json')
        .expect(303)
        .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .end(done)
    })

    it('should redirect user from /auth_waiting to the returnURL when connector returns a successful status and is web payment (Apple/Google Pay)', function (done) {
      const cookieValue = cookie.create(chargeId)
      const walletType = 'apple-pay'

      nock(process.env.CONNECTOR_HOST)
        .get('/v1/frontend/charges/' + chargeId).reply(200, defaultConnectorResponseForGetCharge(chargeId, State.AUTH_SUCCESS, gatewayAccountId, 'http://www.example.com/service', walletType))
        .post('/v1/frontend/charges/' + chargeId + '/capture').reply(204)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      request(app)
        .get(frontendCardDetailsPath + '/' + chargeId + '/auth_waiting')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Cookie', ['frontend_state=' + cookieValue])
        .set('Accept', 'application/json')
        .expect(303)
        .expect('Location', '/return/' + chargeId)
        .end(done)
    })

    it('should redirect user from /auth_waiting to /3ds_required when connector returns that 3DS is required for authorisation', function (done) {
      const cookieValue = cookie.create(chargeId)
      defaultConnectorResponseForGetCharge(chargeId, State.AUTH_3DS_REQUIRED, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      request(app)
        .get(frontendCardDetailsPath + '/' + chargeId + '/auth_waiting')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Cookie', ['frontend_state=' + cookieValue])
        .set('Accept', 'application/json')
        .expect(303)
        .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/3ds_required')
        .end(done)
    })

    it('should keep user in /auth_waiting when connector returns an authorisation ready state', function (done) {
      const cookieValue = cookie.create(chargeId)
      defaultConnectorResponseForGetCharge(chargeId, State.AUTH_READY, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      request(app)
        .get(frontendCardDetailsPath + '/' + chargeId + '/auth_waiting')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Cookie', ['frontend_state=' + cookieValue])
        .set('Accept', 'application/json')
        .expect(200)
        .end(done)
    })

    it('should give enter_card_details view page if user is in entering card details state', function (done) {
      const cookieValue = cookie.create(chargeId)
      defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      request(app)
        .get(frontendCardDetailsPath + '/' + chargeId + '/auth_waiting')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Cookie', ['frontend_state=' + cookieValue])
        .set('Accept', 'application/json')
        .expect(200)
        .end(done)
    })
  })
})
