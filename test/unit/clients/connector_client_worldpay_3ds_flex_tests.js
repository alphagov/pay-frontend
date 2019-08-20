'use strict'

// NPM dependencies
const path = require('path')
const Pact = require('pact')
const { expect } = require('chai')

// Local dependencies
const connectorClient = require('../../../app/services/clients/connector_client')
const { PactInteractionBuilder } = require('../../fixtures/pact_interaction_builder')
const fixtures = require('../../fixtures/worldpay_3ds_flex_fixtures')

const TEST_CHARGE_ID = 'testChargeId'
const GET_JWT_URL = `/v1/frontend/charges/${TEST_CHARGE_ID}/worldpay/3ds-flex/ddc`

const PORT = Math.floor(Math.random() * 48127) + 1024
const BASE_URL = `http://localhost:${PORT}`

describe('connector client - Worldpay 3DS flex tests', function () {
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

  describe('get Worldpay 3DS flex JWT', function () {
    describe('success', function () {
      const response = fixtures.validDdcJwt()

      before(() => {
        const builder = new PactInteractionBuilder(GET_JWT_URL)
          .withMethod('GET')
          .withState('a Worldpay account exists with 3DS flex credentials and a charge with id testChargeId')
          .withUponReceiving('a valid get Worldpay 3DS flex DDC JWT request')
          .withResponseBody(response.getPactified())
          .withStatusCode(200)
          .build()
        return provider.addInteraction(builder)
      })

      afterEach(() => provider.verify())

      it('should return jwt', async function () {
        const res = await connectorClient({ baseUrl: BASE_URL }).getWorldpay3dsFlexJwt({ chargeId: TEST_CHARGE_ID })
        expect(res.body.jwt).to.be.equal(response.getPlain().jwt)
      })
    })
  })
})
