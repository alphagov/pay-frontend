'use strict'

// Core dependencies
const path = require('path')

// NPM dependencies
const Pact = require('pact')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

// Constants
const TEST_CHARGE_ID = 'testChargeId'
const GOOGLE_AUTH_PATH = `/v1/frontend/charges/${TEST_CHARGE_ID}/wallets/google`
const PORT = Math.floor(Math.random() * 48127) + 1024
const BASEURL = `http://localhost:${PORT}`

// Custom dependencies
const connectorClient = require('../../../app/services/clients/connector_client')
const fixtures = require('../../fixtures/wallet_payment_fixtures')
const { PactInteractionBuilder } = require('../../fixtures/pact_interaction_builder')

// Global setup
const expect = chai.expect
chai.use(chaiAsPromised)

describe('connectors client - google authentication API', function () {
  const provider = Pact({
    consumer: 'frontend',
    provider: 'connector',
    port: PORT,
    log: path.resolve(process.cwd(), 'logs', 'mockserver-integration.log'),
    dir: path.resolve(process.cwd(), 'pacts'),
    spec: 2,
    pactfileWriteMode: 'merge'
  })

  before(() => provider.setup())
  after(() => provider.finalize())

  describe('Authenticate google payment', function () {
    describe('authorisation success', function () {
      const successfulGoogleAuthRequest = fixtures.googleAuthRequestDetails()
      const authorisationSuccessResponse = fixtures.webPaymentSuccessResponse()

      before(() => {
        const builder = new PactInteractionBuilder(GOOGLE_AUTH_PATH)
          .withRequestBody(successfulGoogleAuthRequest.getPactified())
          .withMethod('POST')
          .withState('a sandbox account exists with a charge with id testChargeId that is in state ENTERING_CARD_DETAILS.')
          .withUponReceiving('a valid google pay auth request which should be authorised')
          .withResponseBody(authorisationSuccessResponse.getPactified())
          .withStatusCode(200)
          .build()
        return provider.addInteraction(builder)
      })

      afterEach(() => provider.verify())

      it('should return authorisation success', function (done) {
        const payload = successfulGoogleAuthRequest.getPlain()
        connectorClient({ baseUrl: BASEURL }).chargeAuthWithWallet({
          chargeId: TEST_CHARGE_ID,
          provider: 'google',
          payload: payload
        }).then(res => {
          expect(res.body.status).to.be.equal('AUTHORISATION SUCCESS')
          done()
        }).catch((err) => done(new Error('should not be hit: ' + JSON.stringify(err))))
      })
    })

    describe('authorisation success with no last card digits', function () {
      const successfulGoogleAuthRequest = fixtures.googleAuthRequestDetails({ lastDigitsCardNumber: '' })
      const authorisationSuccessResponse = fixtures.webPaymentSuccessResponse()

      before(() => {
        const builder = new PactInteractionBuilder(GOOGLE_AUTH_PATH)
          .withRequestBody(successfulGoogleAuthRequest.getPactified())
          .withMethod('POST')
          .withState('a sandbox account exists with a charge with id testChargeId that is in state ENTERING_CARD_DETAILS.')
          .withUponReceiving('a valid google pay auth request with no last card digits which should be authorised')
          .withResponseBody(authorisationSuccessResponse.getPactified())
          .withStatusCode(200)
          .build()
        return provider.addInteraction(builder)
      })

      afterEach(() => provider.verify())

      it('should return authorisation success', function (done) {
        const payload = successfulGoogleAuthRequest.getPlain()
        connectorClient({ baseUrl: BASEURL }).chargeAuthWithWallet({
          chargeId: TEST_CHARGE_ID,
          provider: 'google',
          payload: payload
        }).then(res => {
          expect(res.body.status).to.be.equal('AUTHORISATION SUCCESS')
          done()
        }).catch((err) => done(new Error('should not be hit: ' + JSON.stringify(err))))
      })
    })

    describe('authorisation declined', function () {
      const declinedGoogleAuthRequest = fixtures.googleAuthRequestDetails({ lastDigitsCardNumber: '0002' })

      before(() => {
        const builder = new PactInteractionBuilder(GOOGLE_AUTH_PATH)
          .withRequestBody(declinedGoogleAuthRequest.getPactified())
          .withMethod('POST')
          .withState('a sandbox account exists with a charge with id testChargeId that is in state ENTERING_CARD_DETAILS.')
          .withUponReceiving('a valid google pay auth request which should be declined')
          .withStatusCode(400)
          .build()
        return provider.addInteraction(builder)
      })

      afterEach(() => provider.verify())

      it('should return authorisation declined', function (done) {
        connectorClient({ baseUrl: BASEURL }).chargeAuthWithWallet({
          chargeId: TEST_CHARGE_ID,
          provider: 'google',
          payload: declinedGoogleAuthRequest.getPlain()
        }).then(() => {
          done()
        }).catch((err) => done(new Error('should not be hit: ' + JSON.stringify(err))))
      })
    })

    describe('authorisation error', function () {
      const errorGoogleAuthRequest = fixtures.googleAuthRequestDetails({ lastDigitsCardNumber: '0119' })

      before(() => {
        const builder = new PactInteractionBuilder(GOOGLE_AUTH_PATH)
          .withRequestBody(errorGoogleAuthRequest.getPactified())
          .withMethod('POST')
          .withState('a sandbox account exists with a charge with id testChargeId that is in state ENTERING_CARD_DETAILS.')
          .withUponReceiving('a valid google pay auth request which should return an error')
          .withStatusCode(400)
          .build()
        return provider.addInteraction(builder)
      })

      afterEach(() => provider.verify())

      it('should return authorisation declined', function (done) {
        connectorClient({ baseUrl: BASEURL }).chargeAuthWithWallet({
          chargeId: TEST_CHARGE_ID,
          provider: 'google',
          payload: errorGoogleAuthRequest.getPlain()
        }).then(() => {
          done()
        }).catch((err) => done(new Error('should not be hit: ' + JSON.stringify(err))))
      })
    })
  })
})
