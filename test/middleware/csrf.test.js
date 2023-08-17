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

  const noSession = _.cloneDeep(validGetRequest)
  delete noSession.frontend_state.ch_foo

  const noSecret = _.cloneDeep(validGetRequest)
  delete noSecret.frontend_state.ch_foo.csrfSecret

  const invalidPost = _.cloneDeep(validGetRequest)
  delete invalidPost.method
  const invalidPut = _.cloneDeep(invalidPost)

  invalidPost.method = 'POST'
  invalidPut.method = 'PUT'

  const validPost = _.cloneDeep(invalidPost)
  validPost.body.csrfToken = helper.csrfToken()

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

  it('should append csrf on get request', function () {
    const resp = _.cloneDeep(response)
    csrfTokenGeneration(validGetRequest, resp, next)
    assertValidRequest(next, resp, status, render)
  })

  it('should error if no charge in session', function () {
    const resp = _.cloneDeep(response)
    csrfCheck(noSession, resp, next)
    assertUnauthorisedRequest(next, resp, status, render)
  })

  it('should error if no secret in session', function () {
    const resp = _.cloneDeep(response)
    csrfCheck(noSecret, resp, next)
    assertUnauthorisedRequest(next, resp, status, render)
  })

  it('should be successful on post if valid post and append token to used tokens', function () {
    const resp = _.cloneDeep(response)
    csrfCheck(validPost, resp, next)
    csrfTokenGeneration(validGetRequest, resp, next)
    assertValidRequest(next, resp, status, render)
    assert.strictEqual(validPost.frontend_state.ch_foo.csrfTokens[0], validPost.body.csrfToken)
  })

  it('should be unsuccessful on post if token is already used', function () {
    const resp = _.cloneDeep(response)
    csrfCheck(validPost, resp, next)
    assertErrorRequest(next, resp, status, render)
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

  it('should be unsuccessful on put if token is already used', function () {
    const resp = _.cloneDeep(response)
    csrfCheck(validPut, resp, next)
    assertErrorRequest(next, resp, status, render)
  })

  it('should error if no csrfToken in put request', function () {
    const resp = _.cloneDeep(response)
    csrfCheck(invalidPut, resp, next)
    assertErrorRequest(next, resp, status, render)
  })
})
