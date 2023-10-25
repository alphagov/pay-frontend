'use strict'

// Core dependencies
const path = require('path')

// NPM dependencies
const { Pact } = require('@pact-foundation/pact')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

// Constants
const TEST_CHARGE_ID = 'testChargeId'
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

const GOOGLE_DDC_RESULT = 'some long opaque string that’s a device data collection result'

describe('connectors client - worldpay google authentication API', function () {
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

  describe('Authenticate Worldpay google payment', function () {
    describe('authorisation success', function () {
      const successfulGoogleAuthRequest = fixtures.worldpayGoogleAuthRequestDetails({ worldpay3dsFlexDdcResult: GOOGLE_DDC_RESULT })
      const authorisationSuccessResponse = fixtures.webPaymentSuccessResponse()
      before(() => {
        const builder = new PactInteractionBuilder(GOOGLE_AUTH_PATH)
          .withRequestBody(successfulGoogleAuthRequest)
          .withMethod('POST')
          .withState('a Worldpay account exists with a charge with id testChargeId that is in state ENTERING_CARD_DETAILS.')
          .withUponReceiving('a valid worldpay google pay auth request which should be authorised')
          .withResponseBody(pactify(authorisationSuccessResponse))
          .withStatusCode(200)
          .build()
        return provider.addInteraction(builder)
      })

      afterEach(() => provider.verify())

      it('should return authorisation success', function (done) {
        const payload = successfulGoogleAuthRequest
        connectorClient({ baseUrl: BASEURL }).chargeAuthWithWallet({
          chargeId: TEST_CHARGE_ID,
          wallet: 'google',
          payload: payload,
          paymentProvider: 'worldpay'
        }).then(res => {
          expect(res.body.status).to.be.equal('AUTHORISATION SUCCESS')
          done()
        }).catch((err) => done(new Error('should not be hit: ' + JSON.stringify(err))))
      })
    })

    describe('authorisation success with no last card digits', function () {
      const successfulGoogleAuthRequest = fixtures.worldpayGoogleAuthRequestDetails({
        lastDigitsCardNumber: '',
        worldpay3dsFlexDdcResult: GOOGLE_DDC_RESULT
      })
      const authorisationSuccessResponse = fixtures.webPaymentSuccessResponse()

      before(() => {
        const builder = new PactInteractionBuilder(GOOGLE_AUTH_PATH)
          .withRequestBody(successfulGoogleAuthRequest)
          .withMethod('POST')
          .withState('a Worldpay account exists with a charge with id testChargeId that is in state ENTERING_CARD_DETAILS.')
          .withUponReceiving('a valid worldpay google pay auth request with no last card digits which should be authorised')
          .withResponseBody(pactify(authorisationSuccessResponse))
          .withStatusCode(200)
          .build()
        return provider.addInteraction(builder)
      })

      afterEach(() => provider.verify())

      it('should return authorisation success', function (done) {
        const payload = successfulGoogleAuthRequest
        connectorClient({ baseUrl: BASEURL }).chargeAuthWithWallet({
          chargeId: TEST_CHARGE_ID,
          wallet: 'google',
          payload: payload,
          paymentProvider: 'worldpay'
        }).then(res => {
          expect(res.body.status).to.be.equal('AUTHORISATION SUCCESS')
          done()
        }).catch((err) => done(new Error('should not be hit: ' + JSON.stringify(err))))
      })
    })

    describe('authorisation success with no ddc result', function () {
      const successfulGoogleAuthRequest = fixtures.worldpayGoogleAuthRequestDetails()
      const authorisationSuccessResponse = fixtures.webPaymentSuccessResponse()

      before(() => {
        const builder = new PactInteractionBuilder(GOOGLE_AUTH_PATH)
          .withRequestBody(successfulGoogleAuthRequest)
          .withMethod('POST')
          .withState('a Worldpay account exists with a charge with id testChargeId that is in state ENTERING_CARD_DETAILS.')
          .withUponReceiving('a valid worldpay google pay auth request with no ddc result which should be authorised')
          .withResponseBody(pactify(authorisationSuccessResponse))
          .withStatusCode(200)
          .build()
        return provider.addInteraction(builder)
      })

      afterEach(() => provider.verify())

      it('should return authorisation success', function (done) {
        const payload = successfulGoogleAuthRequest
        connectorClient({ baseUrl: BASEURL }).chargeAuthWithWallet({
          chargeId: TEST_CHARGE_ID,
          wallet: 'google',
          payload: payload,
          paymentProvider: 'worldpay'
        }).then(res => {
          expect(res.body.status).to.be.equal('AUTHORISATION SUCCESS')
          done()
        }).catch((err) => done(new Error('should not be hit: ' + JSON.stringify(err))))
      })
    })
  })
})
