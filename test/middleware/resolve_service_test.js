const path = require('path')
const _ = require('lodash')
const sinon = require('sinon')
const q = require('q')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const proxyquire = require('proxyquire')
const Service = require('../../app/models/Service.class')
const serviceFixtures = require('../fixtures/service_fixtures')

chai.use(chaiAsPromised)
const expect = chai.expect

const resolveServiceMiddleware = function (findServicePromise) {
  return proxyquire(path.join(__dirname, '/../../app/middleware/resolve_service.js'), {
    '../services/clients/adminusers_client': () => {
      return {
        findServiceBy: () => {
          return findServicePromise
        }
      }
    }
  })
}

const analyticsDataForErrors = {
  'analyticsId': 'Service unavailable',
  'type': 'Service unavailable',
  'paymentProvider': 'Service unavailable'
}

describe('resolve service middleware', function () {
  it('should resolve service from gateway account id', function (done) {
    const gatewayAccountId = '1'
    const service = new Service(serviceFixtures.validServiceResponse({gateway_account_ids: [gatewayAccountId]}).getPlain())
    const resolveService = resolveServiceMiddleware(q.resolve(service))
    let chargeData = {}
    let req = {
      headers: [],
      chargeId: '111',
      chargeData: _.set(chargeData, 'gateway_account.gateway_account_id', gatewayAccountId)
    }
    let res = {locals: {}}
    let nextSpy = sinon.spy()

    resolveService(req, res, nextSpy).should.be.fulfilled.then(() => {
      expect(nextSpy.called).to.be.equal(true)
    }).should.notify(done)
  })

  it('should display UNAUTHORISED if charge id is missing', function () {
    const resolveService = resolveServiceMiddleware()
    let expectedRenderData = {'analytics': analyticsDataForErrors, 'viewName': 'UNAUTHORISED'}
    let req = {
      headers: []
    }
    let res = {
      status: sinon.spy(),
      render: sinon.spy(),
      locals: {}
    }

    let nextSpy = sinon.spy()
    resolveService(req, res, nextSpy)
    expect(res.status.calledWith(403)).to.be.equal(true)
    expect(res.render.calledWith('errors/system_error', expectedRenderData)).to.be.equal(true) // eslint-disable-line
  })

  it('should display SYSTEM_ERROR if on error retrieving service data', function (done) {
    const gatewayAccountId = '1'
    let expectedRenderData = {'analytics': analyticsDataForErrors, 'viewName': 'SYSTEM_ERROR'}
    const resolveService = resolveServiceMiddleware(q.reject())
    let chargeData = {}
    let req = {
      headers: [],
      chargeId: '111',
      chargeData: _.set(chargeData, 'gateway_account.gateway_account_id', gatewayAccountId)
    }
    let res = {
      status: sinon.spy(),
      render: sinon.spy(),
      locals: {}
    }

    let nextSpy = sinon.spy()
    resolveService(req, res, nextSpy).should.be.fulfilled.then(() => {
      expect(res.status.calledWith(500)).to.be.equal(true)
      expect(res.render.calledWith('errors/system_error', expectedRenderData)).to.be.equal(true) // eslint-disable-line
    }).should.notify(done)
  })
})
