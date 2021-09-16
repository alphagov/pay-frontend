'use strict'

// NPM dependencies
const path = require('path')
const { Pact } = require('@pact-foundation/pact')
const { expect } = require('chai')

// Local dependencies
const connectorClient = require('../../../app/services/clients/connector.client')
const { PactInteractionBuilder } = require('../../test-helpers/pact/pact-interaction-builder')
const worlpay3dsFlexFixtures = require('../../fixtures/worldpay-3ds-flex.fixtures')
const paymentFixtures = require('../../fixtures/payment.fixtures')
const { pactify } = require('../../test-helpers/pact/pact-base')()

const TEST_CHARGE_ID = 'testChargeId'
const GET_JWT_URL = `/v1/frontend/charges/${TEST_CHARGE_ID}/worldpay/3ds-flex/ddc`
const GET_CHARGE_URL = `/v1/frontend/charges/${TEST_CHARGE_ID}`

const PORT = Math.floor(Math.random() * 48127) + 1024
const BASE_URL = `http://localhost:${PORT}`

describe('connector client - Worldpay 3DS flex tests', function () {
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

  describe('get Worldpay 3DS flex JWT', function () {
    describe('success', function () {
      const response = worlpay3dsFlexFixtures.validDdcJwt()

      before(() => {
        const builder = new PactInteractionBuilder(GET_JWT_URL)
          .withMethod('GET')
          .withState('a Worldpay account exists with 3DS flex credentials and a charge with id testChargeId')
          .withUponReceiving('a valid get Worldpay 3DS flex DDC JWT request')
          .withResponseBody(pactify(response))
          .withStatusCode(200)
          .build()
        return provider.addInteraction(builder)
      })

      afterEach(() => provider.verify())

      it('should return jwt', async function () {
        const res = await connectorClient({ baseUrl: BASE_URL }).getWorldpay3dsFlexJwt({ chargeId: TEST_CHARGE_ID })
        expect(res.body.jwt).to.be.equal(response.jwt)
      })
    })
  })

  describe('get charge in 3DS required has a 3DS flex challenge JWT', function () {
    before(() => {
      const response = paymentFixtures.validChargeDetails({
        chargeId: TEST_CHARGE_ID,
        cardTypes: [{ brand: 'visa' }],
        auth3dsData: {
          worldpayChallengeJwt: 'a-jwt'
        }
      })

      const builder = new PactInteractionBuilder(GET_CHARGE_URL)
        .withMethod('GET')
        .withState('a Worldpay account exists with 3DS flex credentials and a charge with id testChargeId that is in state AUTHORISATION_3DS_REQUIRED')
        .withUponReceiving('a valid get charge request')
        .withResponseBody(pactify(response))
        .withStatusCode(200)
        .build()
      return provider.addInteraction(builder)
    })

    afterEach(() => provider.verify())

    it('should return charge with worldpayChallengeJwt', async function () {
      const res = await connectorClient({ baseUrl: BASE_URL }).findCharge({ chargeId: TEST_CHARGE_ID })
      expect(res.body.charge_id).to.be.equal(TEST_CHARGE_ID)
    })
  })
})
