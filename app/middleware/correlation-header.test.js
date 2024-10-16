'use strict'

const proxyquire = require('proxyquire')
const sinon = require('sinon')
const { CORRELATION_HEADER } = require('../../config/correlation-header')

const { expect } = require('chai')

function getCorrelationHeader () {
  return proxyquire('./correlation-header', {
    crypto: {
      randomBytes: function () {
        return 'test-correlation-id'
      }
    }
  })
}

describe('Correlation header', () => {
  it('sets the correlation id when there is no x_request_id header', () => {
    const correlationHeader = getCorrelationHeader()

    const req = {
      headers: {}
    }
    const res = null
    const next = sinon.spy()

    correlationHeader(req, res, next)
    expect(req.headers[CORRELATION_HEADER]).to.equal('test-correlation-id')
    expect(req.correlationId).to.equal('test-correlation-id')
    sinon.assert.calledWithExactly(next)
  })

  it('sets the correlation id using the x-request-id header when it exists', () => {
    const correlationHeader = getCorrelationHeader()
    const xRequestIdHeaderValue = 'x-request-id-value'

    const req = {
      headers: {}
    }

    req.headers[CORRELATION_HEADER] = xRequestIdHeaderValue

    const res = null
    const next = sinon.spy()

    correlationHeader(req, res, next)
    expect(req.headers[CORRELATION_HEADER]).to.equal(xRequestIdHeaderValue)
    expect(req.correlationId).to.equal(xRequestIdHeaderValue)
    sinon.assert.calledWithExactly(next)
  })
})
