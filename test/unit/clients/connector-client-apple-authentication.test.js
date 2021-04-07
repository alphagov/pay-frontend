'use strict'

// Core dependencies
const path = require('path')

// NPM dependencies
const Pact = require('pact')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

// Constants
const TEST_CHARGE_ID = 'testChargeId'
const APPLE_AUTH_PATH = `/v1/frontend/charges/${TEST_CHARGE_ID}/wallets/apple`
const PORT = Math.floor(Math.random() * 48127) + 1024
const BASEURL = `http://localhost:${PORT}`

// Custom dependencies
const connectorClient = require('../../../app/services/clients/connector_client')
const fixtures = require('../../fixtures/wallet_payment_fixtures.js')
const { PactInteractionBuilder } = require('../../fixtures/pact_interaction_builder')

// Global setup
const expect = chai.expect
chai.use(chaiAsPromised)

describe('connectors client - apple authentication API', function () {
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

  describe('Authenticate apple payment', function () {
    describe('authorisation success', function () {
      const appleAuthRequest = fixtures.appleAuthRequestDetails({ email: 'name@email.test' })
      const authorisationSuccessResponse = fixtures.webPaymentSuccessResponse()

      before(() => {
        const builder = new PactInteractionBuilder(APPLE_AUTH_PATH)
          .withRequestBody(appleAuthRequest.getPactified())
          .withMethod('POST')
          .withState('a sandbox account exists with a charge with id testChargeId that is in state ENTERING_CARD_DETAILS.')
          .withUponReceiving('a valid apple pay auth request which should be authorised')
          .withResponseBody(authorisationSuccessResponse.getPactified())
          .withStatusCode(200)
          .build()
        return provider.addInteraction(builder)
      })

      afterEach(() => provider.verify())

      it('should return authorisation success', function (done) {
        const payload = appleAuthRequest.getPlain()
        connectorClient({ baseUrl: BASEURL }).chargeAuthWithWallet({
          chargeId: TEST_CHARGE_ID,
          provider: 'apple',
          payload: payload
        }).then(res => {
          expect(res.body.status).to.be.equal('AUTHORISATION SUCCESS')
          done()
        }).catch((err) => done(new Error('should not be hit: ' + JSON.stringify(err))))
      })
    })

    describe('authorisation success with no last card digits', function () {
      const appleAuthRequest = fixtures.appleAuthRequestDetails({ email: 'name@email.test', lastDigitsCardNumber: '' })
      const authorisationSuccessResponse = fixtures.webPaymentSuccessResponse()

      before(() => {
        const builder = new PactInteractionBuilder(APPLE_AUTH_PATH)
          .withRequestBody(appleAuthRequest.getPactified())
          .withMethod('POST')
          .withState('a sandbox account exists with a charge with id testChargeId that is in state ENTERING_CARD_DETAILS.')
          .withUponReceiving('a valid Apple Pay auth request with no last card digits which should be authorised')
          .withResponseBody(authorisationSuccessResponse.getPactified())
          .withStatusCode(200)
          .build()
        return provider.addInteraction(builder)
      })

      afterEach(() => provider.verify())

      it('should return authorisation success', function (done) {
        const payload = appleAuthRequest.getPlain()
        connectorClient({ baseUrl: BASEURL }).chargeAuthWithWallet({
          chargeId: TEST_CHARGE_ID,
          provider: 'apple',
          payload: payload
        }).then(res => {
          expect(res.body.status).to.be.equal('AUTHORISATION SUCCESS')
          done()
        }).catch((err) => done(new Error('should not be hit: ' + JSON.stringify(err))))
      })
    })
  })

  describe('authorisation success with no email', function () {
    const appleAuthRequest = fixtures.appleAuthRequestDetails()
    const authorisationSuccessResponse = fixtures.webPaymentSuccessResponse()

    before(() => {
      const builder = new PactInteractionBuilder(APPLE_AUTH_PATH)
        .withRequestBody(appleAuthRequest.getPactified())
        .withMethod('POST')
        .withState('a sandbox account exists with a charge with id testChargeId that is in state ENTERING_CARD_DETAILS.')
        .withUponReceiving('a valid Apple Pay auth request with no email address which should be authorised')
        .withResponseBody(authorisationSuccessResponse.getPactified())
        .withStatusCode(200)
        .build()
      return provider.addInteraction(builder)
    })

    afterEach(() => provider.verify())

    it('should return authorisation success', function (done) {
      const payload = appleAuthRequest.getPlain()
      connectorClient({ baseUrl: BASEURL }).chargeAuthWithWallet({
        chargeId: TEST_CHARGE_ID,
        provider: 'apple',
        payload: payload
      }).then(res => {
        expect(res.body.status).to.be.equal('AUTHORISATION SUCCESS')
        done()
      }).catch((err) => done(new Error('should not be hit: ' + JSON.stringify(err))))
    })
  })

  describe('authorisation declined', function () {
    const appleAuthRequest = fixtures.appleAuthRequestDetails({ email: 'name@email.test', lastDigitsCardNumber: '0002' })

    before(() => {
      const builder = new PactInteractionBuilder(APPLE_AUTH_PATH)
        .withRequestBody(appleAuthRequest.getPactified())
        .withMethod('POST')
        .withState('a sandbox account exists with a charge with id testChargeId that is in state ENTERING_CARD_DETAILS.')
        .withUponReceiving('a valid apple pay auth request which should be declined')
        .withStatusCode(400)
        .build()
      return provider.addInteraction(builder)
    })

    afterEach(() => provider.verify())

    it('should return authorisation declined', function (done) {
      connectorClient({ baseUrl: BASEURL }).chargeAuthWithWallet({
        chargeId: TEST_CHARGE_ID,
        provider: 'apple',
        payload: appleAuthRequest.getPlain()
      }).then(() => {
        done()
      }).catch((err) => done(new Error('should not be hit: ' + JSON.stringify(err))))
    })
  })

  describe('authorisation error', function () {
    const appleAuthRequest = fixtures.appleAuthRequestDetails({ email: 'name@email.test', lastDigitsCardNumber: '0119' })

    before(() => {
      const builder = new PactInteractionBuilder(APPLE_AUTH_PATH)
        .withRequestBody(appleAuthRequest.getPactified())
        .withMethod('POST')
        .withState('a sandbox account exists with a charge with id testChargeId that is in state ENTERING_CARD_DETAILS.')
        .withUponReceiving('a valid apple pay auth request which should return an error')
        .withStatusCode(400)
        .build()
      return provider.addInteraction(builder)
    })

    afterEach(() => provider.verify())

    it('should return authorisation declined', function (done) {
      connectorClient({ baseUrl: BASEURL }).chargeAuthWithWallet({
        chargeId: TEST_CHARGE_ID,
        provider: 'apple',
        payload: appleAuthRequest.getPlain()
      }).then(() => {
        done()
      }).catch((err) => done(new Error('should not be hit: ' + JSON.stringify(err))))
    })
  })
})
