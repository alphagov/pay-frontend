var path = require('path')
var assert = require('assert')
var sinon = require('sinon')
var _ = require('lodash')
var expect = require('chai').expect
var nock = require('nock')
var helper = require(path.join(__dirname, '/../test_helpers/test_helpers.js'))

var {csrfCheck, csrfTokenGeneration} = require(path.join(__dirname, '/../../app/middleware/csrf.js'))

describe('retrieve param test', function () {
  var response = {
    status: function () {},
    render: function () {},
    locals: {}
  }
  var status
  var render
  var next
  var validGetRequest = {
    params: {chargeId: 'foo'},
    body: {},
    route: {methods: {get: true}},
    frontend_state: {
      ch_foo: {
        csrfSecret: process.env.CSRF_USER_SECRET
      }
    }
  }

  var noSession = _.cloneDeep(validGetRequest)
  delete noSession.frontend_state.ch_foo

  var noSecret = _.cloneDeep(validGetRequest)
  delete noSecret.frontend_state.ch_foo.csrfSecret

  var invalidPost = _.cloneDeep(validGetRequest)
  delete invalidPost.route.methods.get
  var invalidPut = _.cloneDeep(invalidPost)

  invalidPost.route.methods.post = true
  invalidPut.route.methods.put = true

  var validPost = _.cloneDeep(invalidPost)
  validPost.body.csrfToken = helper.csrfToken()

  var validPut = _.cloneDeep(invalidPut)
  validPut.body.csrfToken = helper.csrfToken()

  var assertErrorRequest = function (next, resp, status, render) {
    expect(next.called).to.not.be.true // eslint-disable-line
    expect(resp.locals.csrf).to.be.undefined // eslint-disable-line
    assert(status.calledWith(500))
    assert(render.calledWith('errors/system_error', { viewName: 'SYSTEM_ERROR' }))
  }

  var assertUnauthorisedRequest = function (next, resp, status, render) {
    expect(next.called).to.not.be.true // eslint-disable-line
    expect(resp.locals.csrf).to.be.undefined // eslint-disable-line
    assert(status.calledWith(403))
    assert(render.calledWith('errors/system_error', { viewName: 'UNAUTHORISED' }))
  }

  var assertValidRequest = function (next, resp, status, render) {
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
    var resp = _.cloneDeep(response)
    csrfTokenGeneration(validGetRequest, resp, next)
    assertValidRequest(next, resp, status, render)
  })

  it('should error if no charge in session', function () {
    var resp = _.cloneDeep(response)
    csrfCheck(noSession, resp, next)
    assertUnauthorisedRequest(next, resp, status, render)
  })

  it('should error if no secret in session', function () {
    var resp = _.cloneDeep(response)
    csrfCheck(noSecret, resp, next)
    assertUnauthorisedRequest(next, resp, status, render)
  })

  it('should be successful on post if valid post and append token to used tokens', function () {
    var resp = _.cloneDeep(response)
    csrfCheck(validPost, resp, next)
    csrfTokenGeneration(validGetRequest, resp, next)
    assertValidRequest(next, resp, status, render)
    assert.equal(validPost.frontend_state.ch_foo.csrfTokens[0], validPost.body.csrfToken)
  })

  it('should be unsuccessful on post if token is already used', function () {
    var resp = _.cloneDeep(response)
    csrfCheck(validPost, resp, next)
    assertErrorRequest(next, resp, status, render)
  })

  it('should error if no csrfToken in post request', function () {
    var resp = _.cloneDeep(response)
    csrfCheck(invalidPost, resp, next)
    assertErrorRequest(next, resp, status, render)
  })

  it('should be successful on post if valid put', function () {
    var resp = _.cloneDeep(response)
    csrfCheck(validPut, resp, next)
    csrfTokenGeneration(validGetRequest, resp, next)
    assertValidRequest(next, resp, status, render)
  })

  it('should be unsuccessful on put if token is already used', function () {
    var resp = _.cloneDeep(response)
    csrfCheck(validPut, resp, next)
    assertErrorRequest(next, resp, status, render)
  })

  it('should error if no csrfToken in put request', function () {
    var resp = _.cloneDeep(response)
    csrfCheck(invalidPut, resp, next)
    assertErrorRequest(next, resp, status, render)
  })
})
