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
    let serviceExternalId = 'randomId'
    let getServiceResponse = serviceFixtures.validServiceResponse({external_id: serviceExternalId})

    context('GET service - success', () => {
      beforeEach((done) => {
        adminUsersMock.addInteraction(
          new PactInteractionBuilder(`${SERVICES_PATH}/${serviceExternalId}`)
            .withState('a service exists with the given id')
            .withUponReceiving('a valid get service users request')
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
        }).should.notify(done)
      })
    })
  })
})
