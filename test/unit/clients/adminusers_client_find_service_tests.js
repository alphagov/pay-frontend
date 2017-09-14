const Pact = require('pact')
const pactProxy = require('../../test_helpers/pact_proxy')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const getAdminUsersClient = require('../../../app/services/clients/adminusers_client')
const serviceFixtures = require('../../fixtures/service_fixtures')
const PactInteractionBuilder = require('../../fixtures/pact_interaction_builder').PactInteractionBuilder

chai.use(chaiAsPromised)

const expect = chai.expect
const SERVICES_PATH = '/v1/api/services'
const mockPort = Math.floor(Math.random() * 65535)
const mockServer = pactProxy.create('localhost', mockPort)

let adminusersClient = getAdminUsersClient({baseUrl: `http://localhost:${mockPort}`})

describe('adminusers client - services API', function () {
  let adminUsersMock

  /**
   * Start the server and set up Pact
   */
  before(function (done) {
    this.timeout(5000)
    mockServer.start().then(function () {
      adminUsersMock = Pact({consumer: 'Frontend-services', provider: 'adminusers', port: mockPort})
      done()
    })
  })

  /**
   * Remove the server and publish pacts to broker
   */
  after(function (done) {
    mockServer.delete()
      .then(() => pactProxy.removeAll())
      .then(() => done())
  })

  describe('service GET API', function () {
    context('GET service - success', () => {
      let serviceExternalId = 'random-id'
      let getServiceResponse = serviceFixtures.validServiceResponse({external_id: serviceExternalId})

      beforeEach((done) => {
        adminUsersMock.addInteraction(
          new PactInteractionBuilder(`${SERVICES_PATH}/${serviceExternalId}`)
            .withState('a service exists with the given id')
            .withUponReceiving('a valid get service request')
            .withResponseBody(getServiceResponse.getPactified())
            .withStatusCode(200)
            .build()
        ).then(() => done())
      })

      afterEach((done) => {
        adminUsersMock.finalize().then(() => done())
      })

      it('should return service successfully', function (done) {
        adminusersClient.getServiceById(serviceExternalId).should.be.fulfilled.then(service => {
          expect(service.externalId).to.be.equal(serviceExternalId)
          expect(service.customBranding.cssUrl).to.be.equal(getServiceResponse.getPlain().custom_branding.css_url)
          expect(service.customBranding.imageUrl).to.be.equal(getServiceResponse.getPlain().custom_branding.image_url)
        }).should.notify(done)
      })
    })

    context('GET service - not found', function () {
      let serviceExternalId = 'non-existent-random-id'

      beforeEach((done) => {
        adminUsersMock.addInteraction(
          new PactInteractionBuilder(`${SERVICES_PATH}/${serviceExternalId}`)
            .withState('a service does not exists with the given id')
            .withUponReceiving('a valid get service request')
            .withStatusCode(404)
            .build()
        ).then(() => done())
      })

      afterEach((done) => {
        adminUsersMock.finalize().then(() => done())
      })

      it('should error 404', function (done) {
        adminusersClient.getServiceById(serviceExternalId).should.be.rejected.should.notify(done)
      })
    })
  })

  describe('service FIND by gateway account id API', function () {
    context('FIND service by gateway account id - success', function () {
      let gatewayAccountId = '101'
      let getServiceResponse = serviceFixtures.validServiceResponse({gateway_account_ids: [gatewayAccountId]})

      beforeEach((done) => {
        adminUsersMock.addInteraction(
          new PactInteractionBuilder(`${SERVICES_PATH}`)
            .withQuery({gatewayAccountId: gatewayAccountId})
            .withState('a service exists with the given gateway account id association')
            .withUponReceiving('a valid find service request')
            .withResponseBody(getServiceResponse.getPactified())
            .withStatusCode(200)
            .build()
        ).then(() => done())
      })

      afterEach((done) => {
        adminUsersMock.finalize().then(() => done())
      })

      it('should return service successfully', function (done) {
        adminusersClient.findServiceBy({gatewayAccountId: gatewayAccountId}).should.be.fulfilled.then(service => {
          expect(service.gatewayAccountIds[0]).to.be.equal(gatewayAccountId)
        }).should.notify(done)
      })
    })

    context('FIND service by gateway account id - bad request', function () {
      let invalidGatewayAccountId = 'not-a-number'

      beforeEach((done) => {
        adminUsersMock.addInteraction(
          new PactInteractionBuilder(`${SERVICES_PATH}`)
            .withQuery({gatewayAccountId: invalidGatewayAccountId})
            .withState('a service exists with the given gateway account id association')
            .withUponReceiving('an invalid find service request')
            .withStatusCode(400)
            .build()
        ).then(() => done())
      })

      afterEach((done) => {
        adminUsersMock.finalize().then(() => done())
      })

      it('error 400', function (done) {
        adminusersClient.findServiceBy({gatewayAccountId: invalidGatewayAccountId}).should.be.rejected.then(response => {
          expect(response.errorCode).to.be.equal(400)
        }).should.notify(done)
      })
    })

    context('FIND service by gateway account id - not found', function () {
      let nonAssociatedGatewayAccountId = '999'

      beforeEach((done) => {
        adminUsersMock.addInteraction(
          new PactInteractionBuilder(`${SERVICES_PATH}`)
            .withQuery({gatewayAccountId: nonAssociatedGatewayAccountId})
            .withState('a service with given gateway account id does not exist')
            .withUponReceiving('a valid find service request')
            .withStatusCode(404)
            .build()
        ).then(() => done())
      })

      afterEach((done) => {
        adminUsersMock.finalize().then(() => done())
      })

      it('error 400', function (done) {
        adminusersClient.findServiceBy({gatewayAccountId: nonAssociatedGatewayAccountId}).should.be.rejected.then(response => {
          expect(response.errorCode).to.be.equal(404)
        }).should.notify(done)
      })
    })
  })
})
