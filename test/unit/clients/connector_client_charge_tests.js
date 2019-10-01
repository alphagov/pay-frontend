'use strict'

// NPM dependencies
const path = require('path')
const Pact = require('pact')
const { expect } = require('chai')

// Local dependencies
const connectorClient = require('../../../app/services/clients/connector_client')
const fixtures = require('../../fixtures/payment_fixtures')
const { PactInteractionBuilder } = require('../../fixtures/pact_interaction_builder')

const TEST_CHARGE_ID = 'testChargeId'
const GET_CHARGE_URL = `/v1/frontend/charges/${TEST_CHARGE_ID}`
const AUTHORISE_CHARGE_URL = `/v1/frontend/charges/${TEST_CHARGE_ID}/cards`

const PORT = Math.floor(Math.random() * 48127) + 1024
const BASE_URL = `http://localhost:${PORT}`

describe('connector client - charge tests', function () {
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

  describe('making auth request', function () {
    const authRequest = fixtures.validAuthorisationRequest()

    before(() => {
      const response = fixtures.validChargeCardDetailsAuthorised()
      const builder = new PactInteractionBuilder(AUTHORISE_CHARGE_URL)
        .withRequestBody(authRequest.getPactified())
        .withMethod('POST')
        .withState('a sandbox account exists with a charge with id testChargeId that is in state ENTERING_CARD_DETAILS.')
        .withUponReceiving('an authorisation request')
        .withResponseBody(response.getPactified())
        .withStatusCode(200)
        .build()
      return provider.addInteraction(builder)
    })

    afterEach(() => provider.verify())

    it('should return authorisation success', async function () {
      const res = await connectorClient({ baseUrl: BASE_URL }).chargeAuth({
        chargeId: TEST_CHARGE_ID,
        payload: authRequest.getPlain()
      })
      expect(res.body.status).to.be.equal('AUTHORISATION SUCCESS')
    })
  })

  describe('find charge', function () {
    before(() => {
      const response = fixtures.validChargeDetails({
        chargeId: TEST_CHARGE_ID,
        cardTypes: [{ brand: 'visa' }]
      })

      const builder = new PactInteractionBuilder(GET_CHARGE_URL)
        .withMethod('GET')
        .withState('a sandbox account exists with a charge with id testChargeId that is in state ENTERING_CARD_DETAILS.')
        .withUponReceiving('a valid get charge request')
        .withResponseBody(response.getPactified())
        .withStatusCode(200)
        .build()
      return provider.addInteraction(builder)
    })

    afterEach(() => provider.verify())

    it('should return charge', async function () {
      const res = await connectorClient({ baseUrl: BASE_URL }).findCharge({ chargeId: TEST_CHARGE_ID })
      expect(res.body.charge_id).to.be.equal(TEST_CHARGE_ID)
    })
  })
})
