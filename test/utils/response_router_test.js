'use strict'

// npm dependencies
const {expect} = require('chai')
const sinon = require('sinon')
const lodash = require('lodash')

// local dependencies
const serviceFixtures = require('../fixtures/service_fixtures')
const Service = require('../../app/models/Service.class')
const responseRouter = require('../../app/utils/response_router')
const testHelpers = require('../test_helpers/test_helpers')

// constants
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
  'ENTERING_CARD_DETAILS',
  'AWAITING_CAPTURE_REQUEST'
]

describe('rendering behaviour', () => {
  const service = serviceFixtures.validServiceResponse().getPlain()

  const request = {}

  const response = {
    status: () => {},
    render: () => {},
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

  it('should call a view correctly', () => {
    responseRouter.response(request, response, 'NOT_FOUND')
    expect(status.lastCall.args).to.deep.equal([404])
    expect(render.lastCall.args).to.deep.equal(['error', {message: 'Page cannot be found', viewName: 'NOT_FOUND'}])
  })

  it('should return a 200 by default', () => {
    responseRouter.response(request, response, 'CAPTURE_FAILURE')
    expect(status.lastCall.args).to.deep.equal([200])
    expect(render.lastCall.args).to.deep.equal(['errors/incorrect_state/capture_failure', {viewName: 'CAPTURE_FAILURE'}])
  })

  it('should return locals passed in', () => {
    responseRouter.response(request, response, 'HUMANS', {custom: 'local'})
    expect(render.lastCall.args[1]).to.have.property('custom').to.equal('local')
  })

  it('should render error view when view not found', () => {
    responseRouter.response(request, response, 'AINT_NO_VIEW_HERE')
    expect(status.lastCall.args).to.deep.equal([500])
    expect(render.lastCall.args).to.deep.equal(['error', {
      message: 'There is a problem, please try again later',
      viewName: 'error'
    }])
  })

  const defaultTemplates = {
    'ERROR': {
      template: 'error',
      code: 500,
      message: 'There is a problem, please try again later'
    },
    'NOT_FOUND': {
      template: 'error',
      code: 404,
      message: 'Page cannot be found'
    },
    'HUMANS': {
      template: 'plain_message',
      code: 200,
      message: 'GOV.UK Payments is built by a team at the Government Digital Service in London. If you\'d like to join us, see https://gds.blog.gov.uk/jobs'
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
  }).getPlain()

  const request = {}

  const response = {
    status: () => {},
    render: () => {},
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
  }).getPlain()
  const returnUrl = 'https://service.example.com/return_url'
  const chargeData = testHelpers.rawSuccessfulGetCharge('capture error', returnUrl)

  const request = {
    chargeData: chargeData
  }

  const response = {
    redirect: () => {},
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
  }).getPlain()

  const request = {}

  const response = {
    status: () => {},
    render: () => {},
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
