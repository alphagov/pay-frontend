'use strict'

// NPM dependencies
const sinon = require('sinon')
const { expect } = require('chai')
const nock = require('nock')
const { validChargeDetails } = require('../fixtures/payment_fixtures')
const retrieveCharge = require('../../app/middleware/retrieve_charge')

const ANALYTICS_ERROR = {
  analytics: {
      analyticsId: 'Service unavailable',
      type: 'Service unavailable',
      paymentProvider: 'Service unavailable',
      amount: '0.00'
  }
}

describe('retrieve charge test', () => {
  const response = {
    status: () => { },
    render: () => { },
    locals: {}
  }
  let status
  let render
  let next
  const validRequest = {
    params: { chargeId: 'foo' },
    body: {},
    method: 'GET',
    frontend_state: { ch_foo: true },
    headers: {}
  }
  const chargeId = 'foo'

  beforeEach(() => {
    status = sinon.stub(response, 'status')
    render = sinon.stub(response, 'render')
    next = sinon.spy()
    nock.cleanAll()
  })

  afterEach(() => {
    status.restore()
    render.restore()
  })

  it('should set chargeData chargeID and call next on success', done => {
    const chargeData = validChargeDetails().getPlain()
    nock(process.env.CONNECTOR_HOST)
      .get(`/v1/frontend/charges/${chargeId}`)
      .reply(200, chargeData)
    retrieveCharge(validRequest, response, next)

    const testPromise = new Promise((resolve) => {
      setTimeout(() => { resolve() }, 100)
    })

    testPromise.then(result => {
      try {
        expect(status.calledWith(200))
        expect(validRequest.chargeId).to.equal(chargeId)
        expect(validRequest.chargeData).to.deep.equal(chargeData)
        expect(next.called).to.be.true // eslint-disable-line
        done()
      } catch (err) { done(err) }
    }, done)
  })

  it('should call not found view if the connector does not respond', done => {
    retrieveCharge(validRequest, response, next)
    const testPromise = new Promise((resolve) => {
      setTimeout(() => { resolve() }, 700)
    })

    testPromise.then(result => {
      try {
        expect(status.calledWith(500))
        expect(render.calledWith('errors/system_error', {
          viewName: 'SYSTEM_ERROR',
          analytics: ANALYTICS_ERROR.analytics
        }))
        expect(next.notCalled).to.be.true // eslint-disable-line
        done()
      } catch (err) { done(err) }
    }, done)
  })
})
