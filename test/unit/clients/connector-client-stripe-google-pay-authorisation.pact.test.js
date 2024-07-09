'use strict'

// Core dependencies
const path = require('path')

// NPM dependencies
const { Pact } = require('@pact-foundation/pact')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

// Constants
const TEST_CHARGE_ID = 'testChargeId'
const CHARGE_OPTIONS = {
  chargeId: TEST_CHARGE_ID,
  wallet: 'google',
  paymentProvider: 'stripe'
}
const GOOGLE_AUTH_PATH = `/v1/frontend/charges/${TEST_CHARGE_ID}/wallets/google`
const PORT = Math.floor(Math.random() * 48127) + 1024
const BASEURL = `http://127.0.0.1:${PORT}`

// Custom dependencies
const connectorClient = require('../../../app/services/clients/connector.client')
const fixtures = require('../../fixtures/wallet-payment.fixtures')
const { PactInteractionBuilder } = require('../../test-helpers/pact/pact-interaction-builder')
const { pactify } = require('../../test-helpers/pact/pact-base')()

// Global setup
const expect = chai.expect
chai.use(chaiAsPromised)

describe('Connectors Client - Google Pay authorisation API - Stripe payment', function () {
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

  describe('Authorise Stripe Google Pay payment', function () {
    describe('authorisation success', function () {
      const successfulGoogleAuthRequest = fixtures.stripeGoogleAuthRequestDetails()
      const authorisationSuccessResponse = fixtures.webPaymentSuccessResponse()
      before(() => {
        const builder = new PactInteractionBuilder(GOOGLE_AUTH_PATH)
          .withRequestBody(successfulGoogleAuthRequest)
          .withMethod('POST')
          .withState('a Stripe account exists with a charge with id testChargeId that is in state ENTERING_CARD_DETAILS.')
          .withUponReceiving('a valid stripe google pay auth request which should be authorised')
          .withResponseBody(pactify(authorisationSuccessResponse))
          .withStatusCode(200)
          .build()
        return provider.addInteraction(builder)
      })

      afterEach(() => provider.verify())

      it('should return authorisation success', async () => {
        try {
          const res = await connectorClient({ baseUrl: BASEURL }).chargeAuthWithWallet({
            ...CHARGE_OPTIONS,
            payload: successfulGoogleAuthRequest
          })

          expect(res.data.status).to.be.equal('AUTHORISATION SUCCESS')
        } catch (err) {
          throw new Error('should not be hit: ' + JSON.stringify(err))
        }
      })
    })

    describe('authorisation success with no last card digits', function () {
      const successfulGoogleAuthRequest = fixtures.stripeGoogleAuthRequestDetails({
        lastDigitsCardNumber: ''
      })
      const authorisationSuccessResponse = fixtures.webPaymentSuccessResponse()
      before(() => {
        const builder = new PactInteractionBuilder(GOOGLE_AUTH_PATH)
          .withRequestBody(successfulGoogleAuthRequest)
          .withMethod('POST')
          .withState('a Stripe account exists with a charge with id testChargeId that is in state ENTERING_CARD_DETAILS.')
          .withUponReceiving('a valid stripe google pay auth request with no last card digits which should be authorised')
          .withResponseBody(pactify(authorisationSuccessResponse))
          .withStatusCode(200)
          .build()
        return provider.addInteraction(builder)
      })

      afterEach(() => provider.verify())

      it('should return authorisation success', async () => {
        try {
          const res = await connectorClient({ baseUrl: BASEURL }).chargeAuthWithWallet({
            ...CHARGE_OPTIONS,
            payload: successfulGoogleAuthRequest
          })

          expect(res.data.status).to.be.equal('AUTHORISATION SUCCESS')
        } catch (err) {
          throw new Error('should not be hit: ' + JSON.stringify(err))
        }
      })
    })
  })
})
