'use strict'

// NPM dependencies
const request = require('supertest')
const nock = require('nock')
const chai = require('chai')
const logger = require('../../app/utils/logger')(__filename)
const expect = chai.expect
const proxyquire = require('proxyquire')

// Local dependencies
const cookie = require('../test_helpers/session')
const helper = require('../test_helpers/test_helpers')
const {
  defaultConnectorResponseForGetCharge,
  defaultAdminusersResponseForGetService
} = helper
const State = require('../../config/state')
const random = require('../../app/utils/random')

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

describe('Cancel tests', function () {
  const chargeId = '23144323'
  const frontendCardDetailsPath = '/card_details'
  const gatewayAccountId = gatewayAccount.gatewayAccountId

  beforeEach(function () {
    nock.cleanAll()
  })

  before(function () {
    // Disable logging.
    logger.level = 'none'
  })

  describe('The cancel endpoint', function () {
    it('should take user to cancel page on successful cancel when charge in entering card details state', function (done) {
      const cancelEndpoint = frontendCardDetailsPath + '/' + chargeId + '/cancel'
      defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      nock(process.env.CONNECTOR_HOST)
        .post('/v1/frontend/charges/' + chargeId + '/cancel').reply(204)

      request(app)
        .post(cancelEndpoint)
        .send({ csrfToken: helper.csrfToken() })
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .expect(200)
        .end(done)
    })

    it('should take user to cancel page on successful cancel when charge in authorisation successful state', function (done) {
      const cancelEndpoint = frontendCardDetailsPath + '/' + chargeId + '/cancel'
      defaultConnectorResponseForGetCharge(chargeId, State.AUTH_SUCCESS, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      nock(process.env.CONNECTOR_HOST)
        .post('/v1/frontend/charges/' + chargeId + '/cancel').reply(204)

      request(app)
        .post(cancelEndpoint)
        .send({ csrfToken: helper.csrfToken() })
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .expect(200)
        .end(done)
    })

    it('should take user to error page on failed cancel', function (done) {
      const cancelEndpoint = frontendCardDetailsPath + '/' + chargeId + '/cancel'
      defaultConnectorResponseForGetCharge(chargeId, State.AUTH_SUCCESS, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      nock(process.env.CONNECTOR_HOST)
        .post('/v1/frontend/charges/' + chargeId + '/cancel').reply(400)

      request(app)
        .post(cancelEndpoint)
        .send({ csrfToken: helper.csrfToken() })
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .expect(500)
        .end(done)
    })

    it('should redirect user to service return_url on successful cancel when direct redirect enabled on the service', function (done) {
      const returnUrl = 'http://www.example.com/service'
      const gatewayAccountId = random.randomInt(1, 9999999).toString()
      const cancelEndpoint = frontendCardDetailsPath + '/' + chargeId + '/cancel'
      defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId, returnUrl)
      helper.adminusersResponseForGetServiceWithDirectRedirectEnabled(gatewayAccountId)

      nock(process.env.CONNECTOR_HOST)
        .post('/v1/frontend/charges/' + chargeId + '/cancel').reply(204)

      request(app)
        .post(cancelEndpoint)
        .send({ csrfToken: helper.csrfToken() })
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .expect(302)
        .expect(res => expect(res.headers.location).to.equal(returnUrl))
        .end(done)
    })
  })
})
