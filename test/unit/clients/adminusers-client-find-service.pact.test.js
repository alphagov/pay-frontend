'use strict'

// Core dependencies
const path = require('path')

// NPM dependencies
const { Pact } = require('@pact-foundation/pact')
const { expect } = require('chai')

// Constants
const SERVICES_PATH = '/v1/api/services'
const PORT = Math.floor(Math.random() * 48127) + 1024
const BASE_URL = `http://127.0.0.1:${PORT}`

// Custom dependencies
const adminUsersClient = require('../../../app/services/clients/adminusers.client')
const serviceFixtures = require('../../fixtures/service.fixtures')
const PactInteractionBuilder = require('../../test-helpers/pact/pact-interaction-builder').PactInteractionBuilder
const { pactify } = require('../../test-helpers/pact/pact-base')()

describe('adminusers client - services API', function () {
  const provider = new Pact({
    consumer: 'frontend-to-be',
    provider: 'adminusers',
    port: PORT,
    log: path.resolve(process.cwd(), 'logs', 'mockserver-integration.log'),
    dir: path.resolve(process.cwd(), 'pacts'),
    spec: 2,
    pactfileWriteMode: 'merge'
  })

  before(() => provider.setup())
  after(() => provider.finalize())

  describe('FIND service by gateway account id', function () {
    describe('success', function () {
      const gatewayAccountId = '101'

      before(() => {
        const getServiceResponse = serviceFixtures.validServiceResponse({ gateway_account_ids: [gatewayAccountId] })

        const builder = new PactInteractionBuilder(`${SERVICES_PATH}`)
          .withMethod('GET')
          .withQuery({ gatewayAccountId: gatewayAccountId })
          .withState('a service exists with the given gateway account id association')
          .withUponReceiving('a valid find service request')
          .withResponseBody(pactify(getServiceResponse))
          .withStatusCode(200)
          .build()

        return provider.addInteraction(builder)
      })

      afterEach(() => provider.verify())

      it('should return service successfully', async function () {
        const res = await adminUsersClient({ baseUrl: BASE_URL }).findServiceBy(
          { gatewayAccountId: gatewayAccountId }
        )

        expect(res.gatewayAccountIds[0]).to.be.equal(gatewayAccountId)
      })
    })

    describe('bad request', function () {
      const invalidGatewayAccountId = 'not-a-number'
      beforeEach(() => {
        const builder = new PactInteractionBuilder(`${SERVICES_PATH}`)
          .withMethod('GET')
          .withQuery({ gatewayAccountId: invalidGatewayAccountId })
          .withState('a service exists with the given gateway account id association')
          .withUponReceiving('an invalid find service request')
          .withStatusCode(400)
          .build()

        return provider.addInteraction(builder)
      })

      afterEach(() => provider.verify())

      it('error 400', async function () {
        try {
          const response = await adminUsersClient({ baseUrl: BASE_URL }).findServiceBy(
            { gatewayAccountId: invalidGatewayAccountId }
          )
          expect(response.status).to.be.equal(400)
        } catch (error) {
          throw new Error('should not be hit')
        }
      })
    })

    describe('not found', function () {
      const nonAssociatedGatewayAccountId = '999'
      beforeEach(() => {
        const builder = new PactInteractionBuilder(`${SERVICES_PATH}`)
          .withMethod('GET')
          .withQuery({ gatewayAccountId: nonAssociatedGatewayAccountId })
          .withState('a service with given gateway account id does not exist')
          .withUponReceiving('a valid find service request')
          .withStatusCode(404)
          .build()

        return provider.addInteraction(builder)
      })
      afterEach(() => provider.verify())

      it('error 404', async function () {
        try {
          const response = await adminUsersClient({ baseUrl: BASE_URL }).findServiceBy(
            { gatewayAccountId: nonAssociatedGatewayAccountId }
          )
          expect(response.status).to.be.equal(404)
        } catch (error) {
          throw new Error('should not be hit')
        }
      })
    })
  })
})
