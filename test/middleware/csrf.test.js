const assert = require('assert')
const sinon = require('sinon')
const _ = require('lodash')
const expect = require('chai').expect
const nock = require('nock')
const helper = require('../test-helpers/test-helpers.js')
const { checkToken, generateToken } = require('../../app/middleware/csrf.js')

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
      csrfSecret: process.env.CSRF_USER_SECRET,
      ch_foo: {
       data: 'blah'
      }
    },
    get: () => null
  }

  const noCharge = _.cloneDeep(validGetRequest)
  delete noCharge.frontend_state.ch_foo

  const invalidPost = _.cloneDeep(validGetRequest)
  delete invalidPost.method
  const invalidPut = _.cloneDeep(invalidPost)

  invalidPost.method = 'POST'
  invalidPut.method = 'PUT'

  const validPost = _.cloneDeep(invalidPost)
  validPost.body.csrfToken = helper.csrfToken()

  const noSecret = _.cloneDeep(validPost)
  delete noSecret.frontend_state.csrfSecret

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

  const callCheckToken = (scenario, expectedResponse, next) => {
    const [checkTokenMiddleware, handleCsrfError] = checkToken
    checkTokenMiddleware(scenario, expectedResponse, (err) => {
      // simulate next(err)
      if (err) {
        handleCsrfError(err, scenario, expectedResponse, next)
      } else {
        next()
      }
    })
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
    generateToken(validGetRequest, resp, next)
    assertValidRequest(next, resp, status, render)
  })

  it('should error if no charge in session', function () {
    const resp = _.cloneDeep(response)
    callCheckToken(noCharge, resp, next)
    assertUnauthorisedRequest(next, resp, status, render)
  })

  it('should error if no secret in session', function () {
    const resp = _.cloneDeep(response)
    callCheckToken(noSecret, resp, next)
    assertUnauthorisedRequest(next, resp, status, render)
  })

  it('should error if no csrfToken in post request', function () {
    const resp = _.cloneDeep(response)
    callCheckToken(invalidPost, resp, next)
    assertErrorRequest(next, resp, status, render)
  })

  it('should be successful on post if valid put', function () {
    const resp = _.cloneDeep(response)
    callCheckToken(validPut, resp, next)
    generateToken(validGetRequest, resp, next)
    assertValidRequest(next, resp, status, render)
  })

  it('should error if no csrfToken in put request', function () {
    const resp = _.cloneDeep(response)
    callCheckToken(invalidPut, resp, next)
    assertErrorRequest(next, resp, status, render)
  })
})
