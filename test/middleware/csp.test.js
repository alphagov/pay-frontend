/* eslint-disable */
const request = require('supertest')
const express = require('express')
const sinon = require('sinon')
const { expect } = require('chai')
const proxyquire = require('proxyquire')

const loggingSpy = sinon.spy()
const sentrySpy = sinon.spy()

const {
  rateLimitMiddleware,
  captureEventMiddleware,
  requestParseMiddleware,
  detectErrorsMiddleware
} = proxyquire('../../app/middleware/csp', {
  '../utils/logger': () => ({
    info: loggingSpy
  }),
  '../utils/sentry': {
    initialiseSentry: () => ({
      captureEvent: sentrySpy
    })
  }
})

const cspMiddlewareStack = [
  rateLimitMiddleware,
  requestParseMiddleware(2000),
  detectErrorsMiddleware,
  captureEventMiddleware([
    'banned.com' // ignored domain
  ])
]

describe('CSP report endpoint', () => {
  const underTest = express()
  underTest.enable('trust proxy')
  underTest.set('trust proxy', 3)
  underTest.use('/test', cspMiddlewareStack)

  beforeEach(() => {
    loggingSpy.resetHistory()
    sentrySpy.resetHistory()
  })

  const validPayload = {
    'csp-report': {
      'blocked-uri': 'https://www.example.com',
      'violated-directive': 'connect-src'
    }
  }

  it('should return 204 and send to sentry if a valid csp report is present', async () => {
    await request(underTest)
      .post('/test')
      .set('user-agent', 'supertest')
      .send(validPayload)
      .expect(204)

    expect(sentrySpy.calledOnce).to.be.true
    expect(sentrySpy.calledWith({
      message: 'Blocked connect-src from https://www.example.com',
      level: 'warning',
      extra: {
        'cspReport': validPayload['csp-report'],
        'userAgent': 'supertest'
      }
    })).to.be.true
  })

  it('should return 204 and not send to sentry if a valid csp report is present but the blocked-uri is ignored', async () => {
    await request(underTest)
      .post('/test')
      .set('user-agent', 'supertest')
      .send({
        'csp-report': {
          'blocked-uri': 'https://www.banned.com',
          'violated-directive': 'connect-src'
        }
      })
      .expect(204)

    expect(sentrySpy.notCalled).to.be.true
  })

  it('should return 400 if content-type is unexpected', async () => {
    await request(underTest)
      .post('/test')
      .set('content-type', 'application/x-www-form-urlencoded')
      .send(validPayload)
      .expect(400)
  })

  it('should return 400 if payload is too large', async () => {

    const largePayload = {
      ...validPayload,
      'large_value': 'some text here x1000'.repeat(1000)
    }

    await request(underTest)
      .post('/test')
      .send(largePayload)
      .expect(400)

    expect(loggingSpy.calledOnce).to.be.true
    expect(loggingSpy.calledWith('CSP violation request payload exceeds maximum size')).to.be.true
  })

  it('should return 400 if request is not JSON', async () => {
    await request(underTest)
      .post('/test')
      .set('content-type', 'application/json')
      .send('notJSON')
      .expect(400)

    expect(loggingSpy.calledOnce).to.be.true
    expect(loggingSpy.calledWith('CSP violation request payload could not be parsed')).to.be.true
  })

  it('should return 400 if json does not included expected values', async () => {
    await request(underTest)
      .post('/test')
      .send({ key: 'value' })
      .expect(400)
  })

  it('should return 429 if too many requests are made and respect trust proxy settings', async () => {

    // X-Forwarded-For: <client>, <proxy1>, <proxy2>, https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For
    // make 10 requests for each 'IP', the 11th should be rate limited

    for (let i = 0; i < 10; i++) {
      await request(underTest)
        .post('/test')
        .set('x-forwarded-for', '1.2.3.4, 2.2.2.2, 3.3.3.3')
        .send(validPayload)
        .expect(204)

      await request(underTest)
        .post('/test')
        .set('x-forwarded-for', '5.6.7.8, 2.2.2.2, 3.3.3.3')
        .send(validPayload)
        .expect(204)
    }

    await request(underTest)
      .post('/test')
      .set('x-forwarded-for', '1.2.3.4, 2.2.2.2, 3.3.3.3')
      .send(validPayload)
      .expect(429)

    await request(underTest)
      .post('/test')
      .set('x-forwarded-for', '5.6.7.8, 2.2.2.2, 3.3.3.3')
      .send(validPayload)
      .expect(429)
  })
})

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
  it('should not set the Content-Security-Policy header if the feature is switched off', () => {
    process.env.CSP_SEND_HEADER = 'false'
    const csp = requireHelper('../../app/middleware/csp')

    const next = sinon.spy()
    const response = { setHeader: sinon.spy(), removeHeader: sinon.spy() }
    csp.cardDetails(mockRequest, response, next)

    expect(next.called).to.be.true
    expect(response.setHeader.called).to.be.false
  })

  it('should set Report-Only on Content-Security-Policy if enforce policy is switched off', () => {
    process.env.CSP_SEND_HEADER = 'true'
    process.env.CSP_ENFORCE = 'false'
    const csp = requireHelper('../../app/middleware/csp')

    const next = sinon.spy()
    const response = { setHeader: sinon.spy(), removeHeader: sinon.spy() }
    csp.cardDetails(mockRequest, response, next)

    sinon.assert.calledWith(response.setHeader, 'Content-Security-Policy-Report-Only')
  })

  it('should set standard Content-Security-Policy header (enforced) if enforce policy is switched on', () => {
    process.env.CSP_SEND_HEADER = 'true'
    process.env.CSP_ENFORCE = 'true'
    const csp = requireHelper('../../app/middleware/csp')

    const next = sinon.spy()
    const response = { setHeader: sinon.spy(), removeHeader: sinon.spy() }
    csp.cardDetails(mockRequest, response, next)

    sinon.assert.calledWith(response.setHeader, 'Content-Security-Policy')
  })

  it('should set Reporting-Endpoints header if enforce policy is switched on', () => {
    process.env.CSP_SEND_HEADER = 'true'
    process.env.CSP_ENFORCE = 'true'
    const csp = requireHelper('../../app/middleware/csp')

    const next = sinon.spy()
    const response = { setHeader: sinon.spy(), removeHeader: sinon.spy() }
    csp.setReportingEndpoints(mockRequest, response, next)

    sinon.assert.calledWith(response.setHeader, 'Reporting-Endpoints')
  })

  it('should add `unsafe-eval` to Content-Security-Policy header when included in configuration', () => {
    process.env.CSP_SEND_HEADER = 'true'
    process.env.CSP_ALLOW_UNSAFE_EVAL_SCRIPTS = 'true'
    const csp = requireHelper('../../app/middleware/csp')

    const next = sinon.spy()
    const response = { setHeader: sinon.spy(), removeHeader: sinon.spy() }
    csp.cardDetails(mockRequest, response, next)

    sinon.assert.calledWith(response.setHeader, 'Content-Security-Policy', sinon.match(/'unsafe-eval'/g))
  })
})
