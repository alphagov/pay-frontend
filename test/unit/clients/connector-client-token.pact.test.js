'use strict'

// NPM dependencies
const path = require('path')
const { Pact } = require('@pact-foundation/pact')
const { expect } = require('chai')

// Local dependencies
const connectorClient = require('../../../app/services/clients/connector.client')
const { validTokenResponse } = require('../../fixtures/payment.fixtures')
const { PactInteractionBuilder } = require('../../test-helpers/pact/pact-interaction-builder')
const { pactify } = require('../../test-helpers/pact/pact-base')()

const PORT = Math.floor(Math.random() * 48127) + 1024
const BASE_URL = `http://localhost:${PORT}`
const TOKEN = 'testToken'
const FRONTEND_TOKEN_URL = `/v1/frontend/tokens/${TOKEN}`

const chargeId = 'chargeExternalId'

describe('connector client - tokens', function () {
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

  describe('get charge data for valid token', function () {
    before(() => {
      const response = validTokenResponse({
        used: false,
        chargeId,
        cardTypes: [{}]
      })
      const builder = new PactInteractionBuilder(FRONTEND_TOKEN_URL)
        .withMethod('GET')
        .withState('an unused token testToken exists with external charge id chargeExternalId associated with it')
        .withUponReceiving('a valid token')
        .withResponseBody(pactify(response))
        .withStatusCode(200)
        .build()
      return provider.addInteraction(builder)
    })

    afterEach(() => provider.verify())

    it('should return chargeId and used indicator', async function () {
      const res = await connectorClient({ baseUrl: BASE_URL }).findByToken({
        tokenId: TOKEN
      })
      expect(res.body.used).to.be.equal(false)
      expect(res.body.charge).to.have.property('charge_id').eq(chargeId)
    })
  })
})
