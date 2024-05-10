'use strict'

// Core dependencies
const path = require('path')

// NPM dependencies
const { Pact } = require('@pact-foundation/pact')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

// Constants
const TEST_CHARGE_ID = 'testChargeId'
const APPLE_AUTH_PATH = `/v1/frontend/charges/${TEST_CHARGE_ID}/wallets/apple`
const PORT = Math.floor(Math.random() * 48127) + 1024
const BASEURL = `http://127.0.0.1:${PORT}`

// Custom dependencies
const connectorClient = require('../../../app/services/clients/connector-axios.client')
const fixtures = require('../../fixtures/wallet-payment.fixtures.js')
const { PactInteractionBuilder } = require('../../test-helpers/pact/pact-interaction-builder')
const { pactify } = require('../../test-helpers/pact/pact-base')()

// Global setup
const expect = chai.expect
chai.use(chaiAsPromised)

describe('connectors client - apple authentication API', function () {
  const provider = new Pact({
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
          .withRequestBody(appleAuthRequest)
          .withMethod('POST')
          .withState('a sandbox account exists with a charge with id testChargeId that is in state ENTERING_CARD_DETAILS.')
          .withUponReceiving('a valid apple pay auth request which should be authorised')
          .withResponseBody(pactify(authorisationSuccessResponse))
          .withStatusCode(200)
          .build()
        return provider.addInteraction(builder)
      })

      afterEach(() => provider.verify())

      it('should return authorisation success', async () => {
        const payload = appleAuthRequest

        try {
          const res = await connectorClient({ baseUrl: BASEURL }).chargeAuthWithWallet({
            chargeId: TEST_CHARGE_ID,
            wallet: 'apple',
            payload: payload
          })

          expect(res.data.status).to.be.equal('AUTHORISATION SUCCESS')
        } catch (err) {
          throw new Error('should not be hit: ' + JSON.stringify(err))
        }
      })
    })

    describe('authorisation success with no last card digits', function () {
      const appleAuthRequest = fixtures.appleAuthRequestDetails({ email: 'name@email.test', lastDigitsCardNumber: '' })
      const authorisationSuccessResponse = fixtures.webPaymentSuccessResponse()

      before(() => {
        const builder = new PactInteractionBuilder(APPLE_AUTH_PATH)
          .withRequestBody(appleAuthRequest)
          .withMethod('POST')
          .withState('a sandbox account exists with a charge with id testChargeId that is in state ENTERING_CARD_DETAILS.')
          .withUponReceiving('a valid Apple Pay auth request with no last card digits which should be authorised')
          .withResponseBody(pactify(authorisationSuccessResponse))
          .withStatusCode(200)
          .build()
        return provider.addInteraction(builder)
      })

      afterEach(() => provider.verify())

      it('should return authorisation success', async () => {
        const payload = appleAuthRequest

        try {
          const res = await connectorClient({ baseUrl: BASEURL }).chargeAuthWithWallet({
            chargeId: TEST_CHARGE_ID,
            wallet: 'apple',
            payload: payload
          })

          expect(res.data.status).to.be.equal('AUTHORISATION SUCCESS')
        } catch (err) {
          throw new Error('should not be hit: ' + JSON.stringify(err))
        }
      })
    })
  })

  describe('authorisation success with no email', function () {
    const appleAuthRequest = fixtures.appleAuthRequestDetails()
    const authorisationSuccessResponse = fixtures.webPaymentSuccessResponse()

    before(() => {
      const builder = new PactInteractionBuilder(APPLE_AUTH_PATH)
        .withRequestBody(appleAuthRequest)
        .withMethod('POST')
        .withState('a sandbox account exists with a charge with id testChargeId that is in state ENTERING_CARD_DETAILS.')
        .withUponReceiving('a valid Apple Pay auth request with no email address which should be authorised')
        .withResponseBody(pactify(authorisationSuccessResponse))
        .withStatusCode(200)
        .build()
      return provider.addInteraction(builder)
    })

    afterEach(() => provider.verify())

    it('should return authorisation success', async () => {
      const payload = appleAuthRequest

      try {
        const res = await connectorClient({ baseUrl: BASEURL }).chargeAuthWithWallet({
          chargeId: TEST_CHARGE_ID,
          wallet: 'apple',
          payload: payload
        })

        expect(res.data.status).to.be.equal('AUTHORISATION SUCCESS')
      } catch (err) {
        throw new Error('should not be hit: ' + JSON.stringify(err))
      }
    })
  })

  describe('authorisation declined', function () {
    const appleAuthRequest = fixtures.appleAuthRequestDetails({ email: 'name@email.test', lastDigitsCardNumber: '0002' })
    const authorisationDeclinedResponse = fixtures.webPaymentDeclinedResponse()

    before(() => {
      const builder = new PactInteractionBuilder(APPLE_AUTH_PATH)
        .withRequestBody(appleAuthRequest)
        .withMethod('POST')
        .withState('a sandbox account exists with a charge with id testChargeId and description DECLINED that is in state ENTERING_CARD_DETAILS.')
        .withUponReceiving('a valid apple pay auth request which should be declined')
        .withResponseBody(pactify(authorisationDeclinedResponse))
        .withStatusCode(400)
        .build()
      return provider.addInteraction(builder)
    })

    afterEach(() => provider.verify())

    it('should return authorisation declined with error identifier in response payload', async () => {
      try {
        await connectorClient({ baseUrl: BASEURL }).chargeAuthWithWallet({
          chargeId: TEST_CHARGE_ID,
          wallet: 'apple',
          payload: appleAuthRequest
        })
      } catch (err) {
        if (err.errorCode === 400) {
          expect(err.errorIdentifier).to.be.equal('AUTHORISATION_REJECTED')
        } else {
          throw new Error('should not be hit: ' + JSON.stringify(err))
        }
      }
    })
  })

  describe('authorisation error', function () {
    const appleAuthRequest = fixtures.appleAuthRequestDetails({ email: 'name@email.test', lastDigitsCardNumber: '0119' })

    before(() => {
      const builder = new PactInteractionBuilder(APPLE_AUTH_PATH)
        .withRequestBody(appleAuthRequest)
        .withMethod('POST')
        .withState('a sandbox account exists with a charge with id testChargeId and description ERROR that is in state ENTERING_CARD_DETAILS.')
        .withUponReceiving('a valid apple pay auth request which should return an error')
        .withStatusCode(402)
        .build()
      return provider.addInteraction(builder)
    })

    afterEach(() => provider.verify())

    it('should return authorisation declined', async () => {
      try {
        await connectorClient({ baseUrl: BASEURL }).chargeAuthWithWallet({
          chargeId: TEST_CHARGE_ID,
          wallet: 'apple',
          payload: appleAuthRequest
        })
      } catch (err) {
        expect(err.errorCode).to.be.equal(402)
      }
    })
  })
})
