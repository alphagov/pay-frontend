'use strict'

// NPM dependencies
const { expect } = require('chai')
const sinon = require('sinon')
const lodash = require('lodash')
const proxyquire = require('proxyquire')

// Local dependencies
const serviceFixtures = require('../fixtures/service.fixtures')
const Service = require('../../app/models/Service.class')
const testHelpers = require('../test-helpers/test-helpers')

const infoLogger = sinon.spy()

const responseRouter = proxyquire('../../app/utils/response-router', {
  './logger': () => { return { info: infoLogger } }
})

// Constants
const nonTerminalActions = [
  'auth_3ds_required',
  'auth_3ds_required_in',
  'auth_3ds_required_out',
  'auth_3ds_required_html_out',
  'auth_waiting',
  'confirm',
  'charge',
  'capture_waiting',
  'HUMANS',
  'AUTHORISATION_3DS_REQUIRED',
  'AUTHORISATION_SUCCESS',
  'AUTHORISATION_READY',
  'ENTERING_CARD_DETAILS',
  'CAPTURE_READY'
]

const terminalActions = [
  'NOT_FOUND',
  'ERROR',
  'SESSION_INCORRECT',
  'SYSTEM_ERROR',
  'NAXSI_SYSTEM_ERROR',
  'UNAUTHORISED',
  'CAPTURE_SUBMITTED',
  'CREATED',
  'EXPIRED',
  'EXPIRE_CANCEL_READY',
  'EXPIRE_CANCEL_FAILED',
  'SYSTEM_CANCELLED',
  'SYSTEM_CANCEL_READY',
  'SYSTEM_CANCEL_ERROR',
  'USER_CANCELLED',
  'USER_CANCEL_READY',
  'USER_CANCEL_ERROR',
  'CAPTURED',
  'CAPTURE_APPROVED',
  'CAPTURE_APPROVED_RETRY',
  'CAPTURE_ERROR',
  'CAPTURE_FAILURE',
  'AUTHORISATION_REJECTED',
  'AUTHORISATION_CANCELLED',
  'AUTHORISATION_ERROR',
  'AWAITING_CAPTURE_REQUEST'
]

describe('rendering behaviour', () => {
  const service = serviceFixtures.validServiceResponse()

  const request = {}

  const response = {
    status: () => { },
    render: () => { },
    locals: {
      service: new Service(service)
    }
  }

  let status
  let render

  beforeEach(() => {
    status = sinon.stub(response, 'status')
    render = sinon.stub(response, 'render')
    infoLogger.resetHistory()
  })

  afterEach(() => {
    status.restore()
    render.restore()
  })

  it('should call a view correctly', () => {
    responseRouter.response(request, response, 'NOT_FOUND')
    expect(status.lastCall.args).to.deep.equal([404])
    expect(render.lastCall.args).to.deep.equal(['error', { message: 'Page cannot be found', viewName: 'NOT_FOUND' }])
  })

  it('should return a 200 by default', () => {
    responseRouter.response(request, response, 'CAPTURE_FAILURE')
    expect(status.lastCall.args).to.deep.equal([200])
    expect(render.lastCall.args).to.deep.equal(['errors/incorrect-state/capture-failure', { viewName: 'CAPTURE_FAILURE' }])
  })

  it('should return locals passed in', () => {
    responseRouter.response(request, response, 'HUMANS', { custom: 'local' })
    expect(render.lastCall.args[1]).to.have.property('custom').to.equal('local')
  })

  it('should render error view when view not found', () => {
    responseRouter.response(request, response, 'AINT_NO_VIEW_HERE')
    expect(status.lastCall.args).to.deep.equal([500])
    expect(render.lastCall.args).to.deep.equal(['error', {
      message: 'There is a problem, please try again later',
      viewName: 'error'
    }])
    sinon.assert.calledWithMatch(infoLogger, sinon.match('Rendering error response'), sinon.match({
      page: 'error',
      reason: 'Response action AINT_NO_VIEW_HERE NOT FOUND'
    }))
  })

  it('should render error response', () => {
    responseRouter.errorResponse(request, response, 'A reason', { returnUrl: 'http://example.com' }, 'err')
    expect(render.lastCall.args).to.deep.equal(['error', {
      returnUrl: 'http://example.com',
      viewName: 'ERROR',
      message: 'There is a problem, please try again later'
    }])
    sinon.assert.calledWithMatch(infoLogger, sinon.match('Rendering error response'), sinon.match({
      page: 'error',
      reason: 'A reason',
      error: 'err'
    }))
  })

  it('should render system error response', () => {
    responseRouter.systemErrorResponse(request, response, 'A reason', { returnUrl: 'http://example.com' }, 'err')
    expect(render.lastCall.args).to.deep.equal(['errors/system-error', {
      returnUrl: 'http://example.com',
      viewName: 'SYSTEM_ERROR'
    }])
    sinon.assert.calledWithMatch(infoLogger, sinon.match('Rendering error response'), sinon.match({
      page: 'errors/system-error',
      reason: 'A reason',
      error: 'err'
    }))
  })

  it('should log an error for AUTHORISATION_ERROR action', () => {
    responseRouter.response(request, response, 'AUTHORISATION_ERROR')
    expect(status.lastCall.args).to.deep.equal([200])
    expect(render.lastCall.args).to.deep.equal(['errors/system-error', {
      viewName: 'AUTHORISATION_ERROR'
    }])
    sinon.assert.calledWithMatch(infoLogger, sinon.match('Rendering error response'), sinon.match({
      page: 'errors/system-error',
      reason: 'Action: AUTHORISATION_ERROR'
    }))
  })

  it('should not log an error for a non-error action', () => {
    responseRouter.response(request, response, 'CAPTURE_SUBMITTED')
    expect(status.lastCall.args).to.deep.equal([200])
    sinon.assert.notCalled(infoLogger)
  })

  const defaultTemplates = {
    ERROR: {
      template: 'error',
      code: 500,
      message: 'There is a problem, please try again later'
    },
    NOT_FOUND: {
      template: 'error',
      code: 404,
      message: 'Page cannot be found'
    },
    HUMANS: {
      template: 'plain-message',
      code: 200,
      message: 'Thanks for everything, David.'
    }
  }

  lodash.forEach(defaultTemplates, (objectValue, objectKey) => {
    it('should be able to render default ' + objectKey + ' page', () => {
      responseRouter.response(request, response, objectKey)
      expect(status.lastCall.args).to.deep.equal([objectValue.code])
      expect(render.lastCall.args).to.deep.equal([objectValue.template, {
        message: objectValue.message,
        viewName: objectKey
      }])
    })
  })
})

describe('behaviour of non-terminal actions with direct redirect enabled on service', () => {
  const service = serviceFixtures.validServiceResponse({
    redirect_to_service_immediately_on_terminal_state: true
  })

  const request = {}

  const response = {
    status: () => { },
    render: () => { },
    locals: {
      service: new Service(service)
    }
  }

  let status
  let render

  beforeEach(() => {
    status = sinon.stub(response, 'status')
    render = sinon.stub(response, 'render')
  })

  afterEach(() => {
    status.restore()
    render.restore()
  })

  nonTerminalActions.forEach((action) => {
    it('should render non-terminal ' + action + ' page', () => {
      responseRouter.response(request, response, action)
      expect(render.called).to.be.equal(true)
    })
  })
})

describe('behaviour of terminal actions with direct redirect enabled on service', () => {
  const service = serviceFixtures.validServiceResponse({
    redirect_to_service_immediately_on_terminal_state: true
  })
  const returnUrl = 'https://service.example.com/return_url'
  const chargeData = testHelpers.rawSuccessfulGetCharge('capture error', returnUrl)

  const request = {
    chargeData: chargeData
  }

  const response = {
    redirect: () => { },
    locals: {
      service: new Service(service)
    }
  }

  let redirect

  beforeEach(() => {
    redirect = sinon.stub(response, 'redirect')
  })

  afterEach(() => {
    redirect.restore()
  })

  terminalActions.forEach((action) => {
    it('should redirect to return URL on terminal ' + action + ' page', () => {
      responseRouter.response(request, response, action)
      expect(redirect.lastCall.args).to.deep.equal([returnUrl])
    })
  })
})

describe('behaviour of terminal actions with direct redirect disabled on service', () => {
  const service = serviceFixtures.validServiceResponse({
    redirect_to_service_immediately_on_terminal_state: false
  })

  const request = {}

  const response = {
    status: () => { },
    render: () => { },
    locals: {
      service: new Service(service)
    }
  }

  let status
  let render

  beforeEach(() => {
    status = sinon.stub(response, 'status')
    render = sinon.stub(response, 'render')
  })

  afterEach(() => {
    status.restore()
    render.restore()
  })

  terminalActions.forEach((action) => {
    it('should render terminal ' + action + ' page', () => {
      responseRouter.response(request, response, action)
      expect(render.called).to.be.equal(true)
    })
  })
})
