'use strict'

// NPM dependencies
const request = require('supertest')
const nock = require('nock')
const logger = require('../../app/utils/logger')(__filename)
const proxyquire = require('proxyquire')

// Local dependencies
const cookie = require('../test-helpers/session')
const helper = require('../test-helpers/test-helpers')
const {
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
  paymentProvider: 'sandbox',
  analyticsId: 'test-1234',
  type: 'test'
}

describe('Capture waiting page tests', function () {
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

  describe('capture waiting endpoint', function () {
    it('should keep user in /capture_waiting when connector returns a capture ready state', function (done) {
      const cookieValue = cookie.create(chargeId)
      defaultConnectorResponseForGetCharge(chargeId, State.CAPTURE_READY, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      request(app)
        .get(frontendCardDetailsPath + '/' + chargeId + '/capture_waiting')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Cookie', ['frontend_state=' + cookieValue])
        .set('Accept', 'application/json')
        .expect(200)
        .end(done)
    })

    it('should take user to capture submitted view when charge in CAPTURE_SUBMITTED state', function (done) {
      const cookieValue = cookie.create(chargeId)
      defaultConnectorResponseForGetCharge(chargeId, State.CAPTURE_SUBMITTED, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      request(app)
        .get(frontendCardDetailsPath + '/' + chargeId + '/capture_waiting')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Cookie', ['frontend_state=' + cookieValue])
        .set('Accept', 'application/json')
        .expect(200)
        .end(done)
    })
  })
})
