'use strict'

// Core dependencies
const path = require('path')

// NPM dependencies
const Pact = require('pact')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

// Constants
const SERVICES_PATH = '/v1/api/services'
const port = Math.floor(Math.random() * 48127) + 1024

// Custom dependencies
const getAdminUsersClient = require('../../../app/services/clients/adminusers_client')
const serviceFixtures = require('../../fixtures/service_fixtures')
const PactInteractionBuilder = require('../../fixtures/pact_interaction_builder').PactInteractionBuilder

// Global setup
const expect = chai.expect
chai.use(chaiAsPromised)
const adminusersClient = getAdminUsersClient({ baseUrl: `http://localhost:${port}` })

describe('adminusers client - services API', function () {
  const provider = Pact({
    consumer: 'frontend-to-be',
    provider: 'adminusers',
    port: port,
    log: path.resolve(process.cwd(), 'logs', 'mockserver-integration.log'),
    dir: path.resolve(process.cwd(), 'pacts'),
    spec: 2,
    pactfileWriteMode: 'merge'
  })

  before(() => provider.setup())
  after((done) => provider.finalize().then(done()))

  describe('FIND service by gateway account id', function () {
    describe('success', function () {
      const gatewayAccountId = '101'
      const getServiceResponse = serviceFixtures.validServiceResponse({ gateway_account_ids: [gatewayAccountId] })
      before((done) => {
        provider.addInteraction(
          new PactInteractionBuilder(`${SERVICES_PATH}`)
            .withQuery({ gatewayAccountId: gatewayAccountId })
            .withState('a service exists with the given gateway account id association')
            .withUponReceiving('a valid find service request')
            .withResponseBody(getServiceResponse.getPactified())
            .withStatusCode(200)
            .build()
        ).then(() => done())
      })
      afterEach(() => provider.verify())
      setTimeout(() => {
        it('should return service successfully', function (done) {
          adminusersClient.findServiceBy({ gatewayAccountId: gatewayAccountId }).then(service => {
            expect(service.gatewayAccountIds[0]).to.be.equal(gatewayAccountId)
            done()
          }).catch((err) => done('should not be hit: ' + JSON.stringify(err)))
        })
      }, 2000)
    })

    describe('bad request', function () {
      const invalidGatewayAccountId = 'not-a-number'
      beforeEach((done) => {
        provider.addInteraction(
          new PactInteractionBuilder(`${SERVICES_PATH}`)
            .withQuery({ gatewayAccountId: invalidGatewayAccountId })
            .withState('a service exists with the given gateway account id association')
            .withUponReceiving('an invalid find service request')
            .withStatusCode(400)
            .build()
        ).then(() => done())
      })
      afterEach(() => provider.verify())
      setTimeout(() => {
        it('error 400', function (done) {
          adminusersClient.findServiceBy({ gatewayAccountId: invalidGatewayAccountId })
            .then(() => done('should not be hit'))
            .catch(response => {
              expect(response.errorCode).to.be.equal(400)
              done()
            })
        })
      }, 3000)
    })

    describe('not found', function () {
      const nonAssociatedGatewayAccountId = '999'
      beforeEach((done) => {
        provider.addInteraction(
          new PactInteractionBuilder(`${SERVICES_PATH}`)
            .withQuery({ gatewayAccountId: nonAssociatedGatewayAccountId })
            .withState('a service with given gateway account id does not exist')
            .withUponReceiving('a valid find service request')
            .withStatusCode(404)
            .build()
        ).then(() => done())
      })
      afterEach(() => provider.verify())
      setTimeout(() => {
        it('error 400', function (done) {
          adminusersClient.findServiceBy({ gatewayAccountId: nonAssociatedGatewayAccountId })
            .then(() => done('should not be hit'))
            .catch(response => {
              expect(response.errorCode).to.be.equal(404)
              done()
            })
        })
      }, 4000)
    })
  })
})
