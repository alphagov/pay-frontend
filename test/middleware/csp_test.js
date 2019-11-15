/* eslint-disable */
const sinon = require('sinon')
const { expect } = require('chai')

const mockRequest = {
  method: 'GET',
  body: {},
  route: { methods: { get: true } },
  headers: {}
}

const requireHelper = function requireHelper (module) {
  delete require.cache[require.resolve(module)]
  return require(module)
}

describe('CSP middleware', () => {
  it('should not apply rules if the feature is switched off', () => {
    process.env.CSP_SEND_HEADER = 'false'
    const csp = requireHelper('../../app/middleware/csp')

    const next = sinon.spy()
    const response = { setHeader: sinon.spy() }
    csp(mockRequest, response, next)

    expect(next.called).to.be.true
    expect(response.setHeader.called).to.be.false
  })

  it('should apply rules if the feature is switched on', () => {
    process.env.CSP_SEND_HEADER = 'true'
    const csp = requireHelper('../../app/middleware/csp')

    const next = sinon.spy()
    const response = { setHeader: sinon.spy() }
    csp(mockRequest, response, next)

    expect(next.called).to.be.true
    expect(response.setHeader.called).to.be.true
  })
})
