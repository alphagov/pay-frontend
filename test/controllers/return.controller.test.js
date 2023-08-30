require('../test-helpers/html-assertions.js')
const proxyquire = require('proxyquire')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

const assert = require('assert')
const sinon = require('sinon')
const nock = require('nock')
const expect = chai.expect

chai.use(chaiAsPromised)

const requireReturnController = function () {
  const mocks = {
    csrf: function () {
      return {
        secretSync: function () {
          return 'foo'
        }
      }
    }
  }

  return proxyquire('../../app/controllers/return.controller.js', mocks)
}

describe('return controller', function () {
  let request, response

  beforeEach(function () {
    request = {
      chargeId: 'aChargeId',
      headers: { 'x-Request-id': 'unique-id' }
    }

    response = {
      redirect: sinon.spy(),
      render: sinon.spy(),
      status: sinon.spy()
    }
  })

  it('should redirect to the original service for terminal (non-cancelable) states', function () {
    request.chargeData = {
      status: 'CAPTURED',
      return_url: 'http://a_return_url.com'
    }

    requireReturnController().return(request, response)
    assert(response.redirect.calledWith('http://a_return_url.com'))
  })

  it('should redirect to the original service for cancelable states', function (done) {
    request.chargeData = {
      status: 'CREATED',
      return_url: 'http://a_return_url.com'
    }

    nock(process.env.CONNECTOR_HOST)
      .post('/v1/frontend/charges/aChargeId/cancel')
      .reply(204)

    requireReturnController().return(request, response)
      .should.be.fulfilled.then(() => {
        assert(response.redirect.calledWith('http://a_return_url.com'))
      }).should.notify(done)
  })

  it('should show an error if cancel fails', function (done) {
    request.chargeData = {
      status: 'CREATED',
      return_url: 'http://a_return_url.com'
    }
    nock(process.env.CONNECTOR_HOST)
      .post('/v1/frontend/charges/aChargeId/cancel')
      .reply(500)

    requireReturnController().return(request, response)
      .should.be.fulfilled.then(() => {
        expect(response.render.called).to.equal(true)
        expect(response.render.getCall(0).args[0]).to.equal('errors/system-error')
        expect(response.render.getCall(0).args[1].viewName).to.equal('SYSTEM_ERROR')
      }).should.notify(done)
  })
})
