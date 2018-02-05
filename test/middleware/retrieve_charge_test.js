var path = require('path')
var assert = require('assert')
var sinon = require('sinon')
var expect = require('chai').expect
var nock = require('nock')

var retrieveCharge = require(path.join(__dirname, '/../../app/middleware/retrieve_charge.js'))

const ANALYTICS_ERROR = {
  analytics: {
    analyticsId: 'Service unavailable',
    type: 'Service unavailable',
    paymentProvider: 'Service unavailable',
    amount: '0.00'
  }
}

describe('retrieve param test', function () {
  var response = {
    status: function () {},
    render: function () {}
  }
  var status
  var render
  var next
  var validRequest = {
    params: {chargeId: 'foo'},
    body: {},
    method: 'GET',
    frontend_state: {ch_foo: true},
    headers: {}
  }
  var chargeId = 'foo'

  beforeEach(function () {
    status = sinon.stub(response, 'status')
    render = sinon.stub(response, 'render')
    next = sinon.spy()
    nock.cleanAll()
  })

  afterEach(function () {
    status.restore()
    render.restore()
  })

  // We don't need to test all states as they are tested in
  // the charge param retriever tests
  it('should call not found view if charge param does not return an id', function () {
    retrieveCharge({params: {}, body: {}}, response, next)
    assert(status.calledWith(403))
    assert(render.calledWith('errors/incorrect_state/session_expired', {viewName: 'UNAUTHORISED', analytics: ANALYTICS_ERROR.analytics}))
    expect(next.notCalled).to.be.true // eslint-disable-line
  })

  it('should call not found view if the connector does not respond', function (done) {
    retrieveCharge(validRequest, response, next)
    var testPromise = new Promise((resolve, reject) => {
      setTimeout(() => { resolve() }, 700)
    })

    testPromise.then((result) => {
      try {
        assert(status.calledWith(500))
        assert(render.calledWith('errors/system_error', {viewName: 'SYSTEM_ERROR', analytics: ANALYTICS_ERROR.analytics}))
        expect(next.notCalled).to.be.true // eslint-disable-line
        done()
      } catch (err) { done(err) }
    }, done)
  })

  it('should set chargeData chargeID and call next on success', function (done) {
    var chargeData = {foo: 'bar'}
    nock(process.env.CONNECTOR_HOST)
        .get(`/v1/frontend/charges/${chargeId}`)
        .reply(200, chargeData)
    retrieveCharge(validRequest, response, next)

    var testPromise = new Promise((resolve, reject) => {
      setTimeout(() => { resolve() }, 100)
    })

    testPromise.then((result) => {
      try {
        expect(status.calledWith(200))
        expect(validRequest.chargeId).to.equal(chargeId)
        expect(validRequest.chargeData).to.deep.equal(chargeData)
        expect(next.called).to.be.true // eslint-disable-line
        done()
      } catch (err) { done(err) }
    }, done)
  })
})
