'use strict'

// Core dependencies
const path = require('path')

// NPM dependencies
const { Pact } = require('@pact-foundation/pact')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

// Constants
const SERVICES_PATH = '/v1/api/services'
const port = Math.floor(Math.random() * 48127) + 1024

// Custom dependencies
const getAdminUsersClient = require('../../../app/services/clients/adminusers.client')
const serviceFixtures = require('../../fixtures/service.fixtures')
const PactInteractionBuilder = require('../../test-helpers/pact/pact-interaction-builder').PactInteractionBuilder
const { pactify } = require('../../test-helpers/pact/pact-base')()

// Global setup
const expect = chai.expect
chai.use(chaiAsPromised)
const adminusersClient = getAdminUsersClient({ baseUrl: `http://127.0.0.1:${port}` })

describe('adminusers client - services API', function () {
  const provider = new Pact({
    consumer: 'frontend-to-be',
    provider: 'adminusers',
    port: port,
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
      const getServiceResponse = serviceFixtures.validServiceResponse({ gateway_account_ids: [gatewayAccountId] })
      before(() => {
        const builder = new PactInteractionBuilder(`${SERVICES_PATH}`)
          .withQuery({ gatewayAccountId: gatewayAccountId })
          .withState('a service exists with the given gateway account id association')
          .withUponReceiving('a valid find service request')
          .withResponseBody(pactify(getServiceResponse))
          .withStatusCode(200)
          .build()

        return provider.addInteraction(builder)
      })

      afterEach(() => provider.verify())

      it('should return service successfully', function (done) {
        adminusersClient.findServiceBy({ gatewayAccountId: gatewayAccountId }).then(service => {
          expect(service.gatewayAccountIds[0]).to.be.equal(gatewayAccountId)
          done()
        }).catch((err) => {
          throw new Error('should not be hit: ' + JSON.stringify(err))
        })
      })
    })

    describe('bad request', function () {
      const invalidGatewayAccountId = 'not-a-number'
      beforeEach(() => {
        const builder = new PactInteractionBuilder(`${SERVICES_PATH}`)
          .withQuery({ gatewayAccountId: invalidGatewayAccountId })
          .withState('a service exists with the given gateway account id association')
          .withUponReceiving('an invalid find service request')
          .withStatusCode(400)
          .build()

        return provider.addInteraction(builder)
      })

      afterEach(() => provider.verify())

      it('error 400', function (done) {
        adminusersClient.findServiceBy({ gatewayAccountId: invalidGatewayAccountId })
          .then(() => {
            throw new Error('should not be hit')
          })
          .catch(response => {
            expect(response.errorCode).to.be.equal(400)
            done()
          })
      })
    })

    describe('not found', function () {
      const nonAssociatedGatewayAccountId = '999'
      beforeEach(() => {
        const builder = new PactInteractionBuilder(`${SERVICES_PATH}`)
          .withQuery({ gatewayAccountId: nonAssociatedGatewayAccountId })
          .withState('a service with given gateway account id does not exist')
          .withUponReceiving('a valid find service request')
          .withStatusCode(404)
          .build()

        return provider.addInteraction(builder)
      })
      afterEach(() => provider.verify())

      it('error 400', function (done) {
        adminusersClient.findServiceBy({ gatewayAccountId: nonAssociatedGatewayAccountId })
          .then(() => {
            throw new Error('should not be hit')
          })
          .catch(response => {
            expect(response.errorCode).to.be.equal(404)
            done()
          })
      })
    })
  })
})
