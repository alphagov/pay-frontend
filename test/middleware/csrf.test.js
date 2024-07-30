const assert = require('assert')
const sinon = require('sinon')
const _ = require('lodash')
const expect = require('chai').expect
const nock = require('nock')
const helper = require('../test-helpers/test-helpers.js')

const { csrfCheck, csrfTokenGeneration } = require('../../app/middleware/csrf.js')

describe('retrieve param test', function () {
  const response = {
    status: function () {},
    render: function () {},
    locals: {}
  }
  let status
  let render
  let next
  const validGetRequest = {
    method: 'GET',
    params: { chargeId: 'foo' },
    body: {},
    route: { methods: { get: true } },
    frontend_state: {
      ch_foo: {
        csrfSecret: process.env.CSRF_USER_SECRET
      }
    },
    get: () => null
  }

  const noCharge = _.cloneDeep(validGetRequest)
  delete noCharge.frontend_state.ch_foo

  const noSecret = _.cloneDeep(validGetRequest)
  delete noSecret.frontend_state.ch_foo.csrfSecret

  const invalidPost = _.cloneDeep(validGetRequest)
  delete invalidPost.method
  const invalidPut = _.cloneDeep(invalidPost)

  invalidPost.method = 'POST'
  invalidPut.method = 'PUT'

  const validPost = _.cloneDeep(invalidPost)
  validPost.body.csrfToken = helper.csrfToken()

  const validPostWithSessionSecretAndChargeSecretAndChargeSecretGeneratedToken = _.cloneDeep(invalidPost)
  validPostWithSessionSecretAndChargeSecretAndChargeSecretGeneratedToken.body.csrfToken = helper.csrfToken(process.env.CSRF_USER_SECRET)
  validPostWithSessionSecretAndChargeSecretAndChargeSecretGeneratedToken.frontend_state.csrfSecret = process.env.CSRF_USER_SECRET_TWO

  const validPostWithSessionSecretAndChargeSecretAndSessionSecretGeneratedToken = _.cloneDeep(invalidPost)
  validPostWithSessionSecretAndChargeSecretAndSessionSecretGeneratedToken.body.csrfToken = helper.csrfToken(process.env.CSRF_USER_SECRET_TWO)
  validPostWithSessionSecretAndChargeSecretAndSessionSecretGeneratedToken.frontend_state.csrfSecret = process.env.CSRF_USER_SECRET_TWO

  const validPostWithSessionSecretAndSessionSecretGeneratedToken = _.cloneDeep(invalidPost)
  delete validPostWithSessionSecretAndSessionSecretGeneratedToken.frontend_state.ch_foo.csrfSecret
  validPostWithSessionSecretAndSessionSecretGeneratedToken.body.csrfToken = helper.csrfToken(process.env.CSRF_USER_SECRET_TWO)
  validPostWithSessionSecretAndSessionSecretGeneratedToken.frontend_state.csrfSecret = process.env.CSRF_USER_SECRET_TWO

  const validPut = _.cloneDeep(invalidPut)
  validPut.body.csrfToken = helper.csrfToken()

  const assertErrorRequest = function (next, resp, status, render) {
    expect(next.called).to.not.be.true // eslint-disable-line
    expect(resp.locals.csrf).to.be.undefined // eslint-disable-line
    assert(status.calledWith(500))
    assert(render.calledWith('errors/system-error', { viewName: 'SYSTEM_ERROR' }))
  }

  const assertUnauthorisedRequest = function (next, resp, status, render) {
    expect(next.called).to.not.be.true // eslint-disable-line
    expect(resp.locals.csrf).to.be.undefined // eslint-disable-line
    assert(status.calledWith(403))
    assert(render.calledWith('errors/incorrect-state/session-expired', { viewName: 'UNAUTHORISED' }))
  }

  const assertValidRequest = function (next, resp, status, render) {
    expect(next.called).to.be.true // eslint-disable-line
    expect(resp.locals.csrf).to.not.be.undefined // eslint-disable-line
  }

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

  it('should append csrf token to response locals on get request', function () {
    const resp = _.cloneDeep(response)
    csrfTokenGeneration(validGetRequest, resp, next)
    assertValidRequest(next, resp, status, render)
  })

  it('should error if no charge in session', function () {
    const resp = _.cloneDeep(response)
    csrfCheck(noCharge, resp, next)
    assertUnauthorisedRequest(next, resp, status, render)
  })

  it('should error if no secret in session', function () {
    const resp = _.cloneDeep(response)
    csrfCheck(noSecret, resp, next)
    assertUnauthorisedRequest(next, resp, status, render)
  })

  it('should error if no csrfToken in post request', function () {
    const resp = _.cloneDeep(response)
    csrfCheck(invalidPost, resp, next)
    assertErrorRequest(next, resp, status, render)
  })

  it('should be successful on post if valid put', function () {
    const resp = _.cloneDeep(response)
    csrfCheck(validPut, resp, next)
    csrfTokenGeneration(validGetRequest, resp, next)
    assertValidRequest(next, resp, status, render)
  })

  it('should use charge secret for csrf check when session secret, charge secret and charge secret generated token are present', function () {
    const resp = _.cloneDeep(response)
    csrfCheck(validPostWithSessionSecretAndChargeSecretAndChargeSecretGeneratedToken, resp, next)
    expect(next.called).to.be.true // eslint-disable-line
  })

  it('should use session secret for csrf check when session secret, charge secret and session secret generated token are present', function () {
    const resp = _.cloneDeep(response)
    csrfCheck(validPostWithSessionSecretAndChargeSecretAndSessionSecretGeneratedToken, resp, next)
    expect(next.called).to.be.true // eslint-disable-line
  })

  it('should use session secret for csrf check when only session secret is set', function () {
    const resp = _.cloneDeep(response)
    csrfCheck(validPostWithSessionSecretAndSessionSecretGeneratedToken, resp, next)
    expect(next.called).to.be.true // eslint-disable-line
  })

  it('should error if no csrfToken in put request', function () {
    const resp = _.cloneDeep(response)
    csrfCheck(invalidPut, resp, next)
    assertErrorRequest(next, resp, status, render)
  })
})
