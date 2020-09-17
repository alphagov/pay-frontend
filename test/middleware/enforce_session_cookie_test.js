'use strict'

// NPM dependencies
const assert = require('assert')
const sinon = require('sinon')
const { expect } = require('chai')
const nock = require('nock')
const { validChargeDetails } = require('../fixtures/payment_fixtures')
const enforceSessionCookie = require('../../app/middleware/enforce_session_cookie')

const ANALYTICS_ERROR = {
    analytics: {
        analyticsId: 'Service unavailable',
        type: 'Service unavailable',
        paymentProvider: 'Service unavailable',
        amount: '0.00'
    }
}

describe('enforce session cookie test', () => {
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

    it('should call not found view if frontend_state cookie not present', () => {
        enforceSessionCookie({ params: {}, body: {} }, response, next)
        assert(status.calledWith(403))
        assert(render.calledWith('errors/incorrect_state/session_expired', {
            viewName: 'UNAUTHORISED',
            analytics: ANALYTICS_ERROR.analytics
        }))
        expect(next.notCalled).to.be.true
    })

    it('should call next when frontend_state cookie contains chargeId', done => {
        const chargeData = validChargeDetails().getPlain()
        nock(process.env.CONNECTOR_HOST)
            .get(`/v1/frontend/charges/${chargeId}`)
            .reply(200, chargeData)
        enforceSessionCookie(validRequest, response, next)

        const testPromise = new Promise((resolve) => {
            setTimeout(() => { resolve() }, 100)
        })

        testPromise.then(result => {
            try {
                expect(status.calledWith(200))
                expect(next.called).to.be.true
                done()
            } catch (err) { done(err) }
        }, done)
    })
})
