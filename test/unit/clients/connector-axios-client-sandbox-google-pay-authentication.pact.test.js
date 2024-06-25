'use strict'

const path = require('path')
const { Pact } = require('@pact-foundation/pact')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

const connectorClient = require('../../../app/services/clients/connector-axios.client')
const fixtures = require('../../fixtures/wallet-payment.fixtures')
const { PactInteractionBuilder } = require('../../test-helpers/pact/pact-interaction-builder')
const { pactify } = require('../../test-helpers/pact/pact-base')()

const expect = chai.expect
chai.use(chaiAsPromised)

const TEST_CHARGE_ID = 'testChargeId'
const GOOGLE_AUTH_PATH = `/v1/frontend/charges/${TEST_CHARGE_ID}/wallets/google`
const PORT = Math.floor(Math.random() * 48127) + 1024
const BASEURL = `http://127.0.0.1:${PORT}`

describe('Connector Client - Google Pay authorisation API - Sandbox payment', function () {
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

  describe('Authorise Sandbox Google Pay payment', function () {
    describe('authorisation success', function () {
      const successfulGoogleAuthRequest = fixtures.worldpayOrSandboxGoogleAuthRequestDetails()
      const authorisationSuccessResponse = fixtures.webPaymentSuccessResponse()
      before(() => {
        const builder = new PactInteractionBuilder(GOOGLE_AUTH_PATH)
          .withRequestBody(successfulGoogleAuthRequest)
          .withMethod('POST')
          .withState('a sandbox account exists with a charge with id testChargeId that is in state ENTERING_CARD_DETAILS.')
          .withUponReceiving('a valid sandbox google pay auth request which should be authorised')
          .withResponseBody(pactify(authorisationSuccessResponse))
          .withStatusCode(200)
          .build()
        return provider.addInteraction(builder)
      })

      afterEach(() => provider.verify())

      it('should return authorisation success', async () => {
        const payload = successfulGoogleAuthRequest

        try {
          const res = await connectorClient({ baseUrl: BASEURL }).chargeAuthWithWallet({
            chargeId: TEST_CHARGE_ID,
            wallet: 'google',
            payload: payload
          })

          expect(res.data.status).to.be.equal('AUTHORISATION SUCCESS')
        } catch (err) {
          throw new Error('should not be hit: ' + JSON.stringify(err))
        }
      })
    })

    describe('authorisation declined', function () {
      const googlePayAuthRequest = fixtures.worldpayOrSandboxGoogleAuthRequestDetails()
      const authorisationDeclinedResponse = fixtures.webPaymentDeclinedResponse()
      before(() => {
        const builder = new PactInteractionBuilder(GOOGLE_AUTH_PATH)
          .withRequestBody(googlePayAuthRequest)
          .withMethod('POST')
          .withState('a sandbox account exists with a charge with id testChargeId and description DECLINED that is in state ENTERING_CARD_DETAILS.')
          .withUponReceiving('a valid sandbox google pay auth request which should be declined')
          .withResponseBody(pactify(authorisationDeclinedResponse))
          .withStatusCode(400)
          .build()
        return provider.addInteraction(builder)
      })

      afterEach(() => provider.verify())

      it('should return authorisation declined with error identifier in response payloads', async () => {
        const payload = googlePayAuthRequest
        try {
          const response = await connectorClient({ baseUrl: BASEURL }).chargeAuthWithWallet({
            chargeId: TEST_CHARGE_ID,
            wallet: 'google',
            payload: payload
          })

          expect(response.status).to.be.equal(400)
          expect(response.data.error_identifier).to.be.equal('AUTHORISATION_REJECTED')
        } catch (err) {
          throw new Error('should not be hit: ' + JSON.stringify(err))
        }
      })
    })
  })
})
