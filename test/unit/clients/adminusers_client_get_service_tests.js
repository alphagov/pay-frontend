// 'use strict'
//
// // NPM dependencies
// const path = require('path')
// const Pact = require('pact')
// const chai = require('chai')
// const chaiAsPromised = require('chai-as-promised')
//
// // Custom dependencies
// const getAdminUsersClient = require('../../../app/services/clients/adminusers_client')
// const serviceFixtures = require('../../fixtures/service_fixtures')
// const PactInteractionBuilder = require('../../fixtures/pact_interaction_builder').PactInteractionBuilder
//
// // Constants
// const port = Math.floor(Math.random() * 48127) + 1024
// const SERVICES_PATH = '/v1/api/services'
//
// // Global setup
// chai.use(chaiAsPromised)
//
// describe.only('adminusers client - services API', function () {
//     const provider = Pact({
//         consumer: 'frontend-to-be',
//         provider: 'adminusers',
//         port: port,
//         log: path.resolve(process.cwd(), 'logs', 'mockserver-integration.log'),
//         dir: path.resolve(process.cwd(), 'pacts'),
//         spec: 2,
//         pactfileWriteMode: 'merge'
//     })
//
//     before(() => provider.setup())
//     after((done) => provider.finalize().then(done()))
//
//     describe('GET service', function () {
//         describe('success', () => {
//             const serviceExternalId = 'random-id'
//             const getServiceResponse = serviceFixtures.validServiceResponse({external_id: serviceExternalId})
//
//             before((done) => {
//                 provider.addInteraction(
//                     new PactInteractionBuilder(`${SERVICES_PATH}/${serviceExternalId}`)
//                         .withState('a service exists with the given id')
//                         .withMethod('GET')
//                         .withUponReceiving('a valid get service request')
//                         .withResponseBody(getServiceResponse.getPactified())
//                         .withStatusCode(200)
//                         .build()
//                 ).then(() => done())
//                     .catch(done)
//             })
//
//             afterEach(() => provider.verify())
//
//             // TODO : There aren't any GET service interactions on the adminusers client in frontend
//         })
//
//         describe('not found', function () {
//             const serviceExternalId = 'non-existent-random-id'
//
//             before((done) => {
//                 provider.addInteraction(
//                     new PactInteractionBuilder(`${SERVICES_PATH}/${serviceExternalId}`)
//                         .withState('a service does not exists with the given id')
//                         .withMethod('GET')
//                         .withUponReceiving('a valid get service request')
//                         .withStatusCode(404)
//                         .build()
//                 ).then(() => done())
//                     .catch(done)
//             })
//
//             afterEach(() => provider.verify())
//
//             // TODO : There aren't any GET service interactions on the adminusers client in frontend
//         })
//     })
// })
