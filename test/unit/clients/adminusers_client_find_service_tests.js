'use strict'

// NPM dependencies
const path = require('path')
const Pact = require('pact')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

// Custom dependencies
const getAdminUsersClient = require('../../../app/services/clients/adminusers_client')
const serviceFixtures = require('../../fixtures/service_fixtures')
const PactInteractionBuilder = require('../../fixtures/pact_interaction_builder').PactInteractionBuilder

// Constants
const port = Math.floor(Math.random() * 48127) + 1024
const adminusersClient = getAdminUsersClient({baseUrl: `http://localhost:${port}`})
const expect = chai.expect
const SERVICES_PATH = '/v1/api/services'

// Global setup
chai.use(chaiAsPromised)

describe('adminusers client - services API', function () {
  let provider = Pact({
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

  describe('GET service', function () {
    describe('success', () => {
      const serviceExternalId = 'random-id'
      const getServiceResponse = serviceFixtures.validServiceResponse({external_id: serviceExternalId})

      before((done) => {
        provider.addInteraction(
          new PactInteractionBuilder(`${SERVICES_PATH}/${serviceExternalId}`)
            .withState('a service exists with the given id')
            .withMethod('GET')
            .withUponReceiving('a valid get service request')
            .withResponseBody(getServiceResponse.getPactified())
            .withStatusCode(200)
            .build()
        ).then(() => done())
          .catch(done)
      })

      afterEach(() => provider.verify())

      // TODO : There aren't any GET service interactions on the adminusers client in frontend
    })

    describe('not found', function () {
      const serviceExternalId = 'non-existent-random-id'

      before((done) => {
        provider.addInteraction(
          new PactInteractionBuilder(`${SERVICES_PATH}/${serviceExternalId}`)
            .withState('a service does not exists with the given id')
            .withMethod('GET')
            .withUponReceiving('a valid get service request')
            .withStatusCode(404)
            .build()
        ).then(() => done())
          .catch(done)
      })

      afterEach(() => provider.verify())

      // TODO : There aren't any GET service interactions on the adminusers client in frontend
    })
  })

  describe('FIND service by gateway account id', function () {
    describe('success', function () {
      let gatewayAccountId = '101'
      let getServiceResponse = serviceFixtures.validServiceResponse({gateway_account_ids: [gatewayAccountId]})

      before((done) => {
        provider.addInteraction(
          new PactInteractionBuilder(`${SERVICES_PATH}`)
            .withQuery({gatewayAccountId: gatewayAccountId})
            .withState('a service exists with the given gateway account id association')
            .withUponReceiving('a valid find service request')
            .withResponseBody(getServiceResponse.getPactified())
            .withStatusCode(200)
            .build()
        ).then(() => done())
      })

      afterEach(() => provider.verify())

      it('should return service successfully', function (done) {
        adminusersClient.findServiceBy({gatewayAccountId: gatewayAccountId}).should.be.fulfilled.then(service => {
          expect(service.gatewayAccountIds[0]).to.be.equal(gatewayAccountId)
        }).should.notify(done)
      })
    })

    describe('bad request', function () {
      let invalidGatewayAccountId = 'not-a-number'

      beforeEach((done) => {
        provider.addInteraction(
          new PactInteractionBuilder(`${SERVICES_PATH}`)
            .withQuery({gatewayAccountId: invalidGatewayAccountId})
            .withState('a service exists with the given gateway account id association')
            .withUponReceiving('an invalid find service request')
            .withStatusCode(400)
            .build()
        ).then(() => done())
      })

      afterEach(() => provider.verify())

      it('error 400', function (done) {
        adminusersClient.findServiceBy({gatewayAccountId: invalidGatewayAccountId}).should.be.rejected.then(response => {
          expect(response.errorCode).to.be.equal(400)
        }).should.notify(done)
      })
    })

    describe('not found', function () {
      let nonAssociatedGatewayAccountId = '999'

      beforeEach((done) => {
        provider.addInteraction(
          new PactInteractionBuilder(`${SERVICES_PATH}`)
            .withQuery({gatewayAccountId: nonAssociatedGatewayAccountId})
            .withState('a service with given gateway account id does not exist')
            .withUponReceiving('a valid find service request')
            .withStatusCode(404)
            .build()
        ).then(() => done())
      })

      afterEach(() => provider.verify())

      it('error 400', function (done) {
        adminusersClient.findServiceBy({gatewayAccountId: nonAssociatedGatewayAccountId}).should.be.rejected.then(response => {
          expect(response.errorCode).to.be.equal(404)
        }).should.notify(done)
      })
    })
  })
})
