'use strict'

// NPM dependencies
const path = require('path')
const _ = require('lodash')
const sinon = require('sinon')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const proxyquire = require('proxyquire')

// Local dependencies
const Service = require('../../app/models/Service.class')
const serviceFixtures = require('../fixtures/service_fixtures')

// Configure
chai.use(chaiAsPromised)
const expect = chai.expect
const errorLogger = sinon.spy()

const resolveServiceMiddleware = function (findServicePromise) {
  return proxyquire(path.join(__dirname, '/../../app/middleware/resolve_service.js'), {
    '../services/clients/adminusers_client': () => {
      return {
        findServiceBy: () => {
          return findServicePromise
        }
      }
    },
    '../utils/logger': () => {
      return {
        error: errorLogger
      }
    }
  })
}

const analyticsDataForErrors = {
  'analyticsId': 'Service unavailable',
  'type': 'Service unavailable',
  'paymentProvider': 'Service unavailable',
  'amount': '0.00'
}

describe('resolve service middleware', function () {
  it('should resolve service from gateway account id', function (done) {
    const gatewayAccountId = '1'
    const service = new Service(serviceFixtures.validServiceResponse({ gateway_account_ids: [gatewayAccountId] }).getPlain())
    const resolveService = resolveServiceMiddleware(Promise.resolve(service))
    const chargeData = {}
    const req = {
      headers: [],
      chargeId: '111',
      chargeData: _.set(chargeData, 'gateway_account.gateway_account_id', gatewayAccountId)
    }
    const res = { locals: {} }
    const nextSpy = sinon.spy()

    resolveService(req, res, nextSpy).should.be.fulfilled.then(() => {
      expect(res.locals.service).to.not.be.undefined // eslint-disable-line
      expect(nextSpy.called).to.be.equal(true)
    }).should.notify(done)
  })

  it('should display UNAUTHORISED if charge id is missing', function () {
    const resolveService = resolveServiceMiddleware()
    const expectedRenderData = { 'analytics': analyticsDataForErrors, 'viewName': 'UNAUTHORISED' }
    const req = {
      headers: []
    }
    const res = {
      status: sinon.spy(),
      render: sinon.spy(),
      locals: {}
    }

    const nextSpy = sinon.spy()
    resolveService(req, res, nextSpy)
    expect(res.status.calledWith(403)).to.be.equal(true)
    expect(res.render.calledWith('errors/incorrect_state/session_expired', expectedRenderData)).to.be.equal(true) // eslint-disable-line
  })

  it('should log an error if it fails to retrieving service data', function (done) {
    const gatewayAccountId = Math.random()
    const resolveService = resolveServiceMiddleware(Promise.reject(new Error('err')))
    const chargeData = {}
    _.set(chargeData, 'gateway_account.gateway_account_id', gatewayAccountId)
    _.set(chargeData, 'gateway_account.serviceName', 'Example Service Name')
    const req = {
      headers: [],
      chargeId: '111',
      chargeData: chargeData
    }
    const res = {
      status: sinon.spy(),
      render: sinon.spy(),
      locals: {}
    }

    const nextSpy = sinon.spy()
    resolveService(req, res, nextSpy).should.be.fulfilled.then(() => {
      expect(errorLogger.called).to.equal(true)
      expect(errorLogger.lastCall.args[0]).to.equal(`Failed to retrieve service information for service: ${chargeData.gateway_account.serviceName}`)
      expect(res.locals.service).to.be.undefined // eslint-disable-line
      expect(nextSpy.called).to.be.equal(true)
    }).should.notify(done)
  })
})
