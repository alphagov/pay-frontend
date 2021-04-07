'use strict'

const lodash = require('lodash')
const logger = require('./logger')(__filename)
const { getLoggingFields } = require('../utils/logging-fields-helper')

const expired = {
  view: 'errors/incorrect-state/session-expired',
  analyticsPage: '/session_expired',
  terminal: true
}

const systemCancelled = {
  view: 'errors/incorrect-state/system-cancelled',
  analyticsPage: '/system_cancelled',
  terminal: true
}

const userCancelled = {
  view: 'user-cancelled',
  locals: { status: 'successful' },
  analyticsPage: '/user_cancelled',
  terminal: true
}

const systemError = {
  code: 500,
  view: 'errors/system-error',
  analyticsPage: '/error',
  terminal: true,
  shouldLogErrorPageShown: true
}

const error = {
  code: 500,
  view: 'error',
  locals: {
    message: 'There is a problem, please try again later'
  },
  analyticsPage: '/error',
  terminal: true,
  shouldLogErrorPageShown: true
}

const actions = {
  auth_3ds_required: {
    view: 'auth-3ds-required',
    analyticsPage: '/3ds_required'
  },
  auth_3ds_required_in: {
    view: 'auth-3ds-required-in',
    analyticsPage: '/3ds_required'
  },
  auth_3ds_required_out: {
    view: 'auth-3ds-required-out',
    analyticsPage: '/3ds_required'
  },
  auth_3ds_required_html_out: {
    view: 'auth-3ds-required-html-out',
    analyticsPage: '/3ds_required'
  },
  auth_waiting: {
    view: 'auth-waiting',
    analyticsPage: '/auth_waiting'
  },
  confirm: {
    view: 'confirm',
    analyticsPage: '/confirm'
  },
  charge: {
    view: 'charge'
  },
  capture_waiting: {
    view: 'capture-waiting',
    analyticsPage: '/capture_waiting'
  },

  NOT_FOUND: {
    code: 404,
    view: 'error',
    locals: {
      message: 'Page cannot be found'
    },
    terminal: true
  },

  ERROR: {
    code: 500,
    view: 'error',
    locals: {
      message: 'There is a problem, please try again later'
    },
    terminal: true,
    shouldLogErrorPageShown: true
  },

  SESSION_INCORRECT: {
    code: 422,
    view: 'errors/incorrect-state/session-expired',
    analyticsPage: '/problem',
    terminal: true
  },

  SYSTEM_ERROR: systemError,

  NAXSI_SYSTEM_ERROR: {
    code: 400,
    view: 'error',
    locals: {
      message: 'Please try again later'
    },
    terminal: true,
    shouldLogErrorPageShown: true
  },

  HUMANS: {
    code: 200,
    view: 'plain-message',
    locals: {
      message: 'GOV.UK Payments is built by a team at the Government Digital Service in London. If you\'d like to join us, see https://gds.blog.gov.uk/jobs'
    }
  },

  UNAUTHORISED: {
    code: 403,
    view: 'errors/incorrect-state/session-expired',
    terminal: true
  },

  CAPTURE_SUBMITTED: {
    view: 'errors/charge-confirm-state-completed',
    locals: { status: 'successful' },
    analyticsPage: '/success_return',
    terminal: true
  },

  CREATED: error,

  EXPIRED: expired,

  EXPIRE_CANCEL_READY: expired,

  EXPIRE_CANCEL_FAILED: expired,

  SYSTEM_CANCELLED: systemCancelled,

  SYSTEM_CANCEL_READY: systemCancelled,

  SYSTEM_CANCEL_ERROR: systemCancelled,

  USER_CANCELLED: userCancelled,

  USER_CANCEL_READY: userCancelled,

  USER_CANCEL_ERROR: userCancelled,

  CAPTURED: {
    view: 'errors/charge-confirm-state-completed',
    locals: { status: 'successful' },
    analyticsPage: '/success_return',
    terminal: true
  },

  CAPTURE_APPROVED: {
    view: 'errors/charge-confirm-state-completed',
    locals: { status: 'successful' },
    analyticsPage: '/success_return',
    terminal: true
  },

  CAPTURE_APPROVED_RETRY: {
    view: 'errors/charge-confirm-state-completed',
    locals: { status: 'successful' },
    analyticsPage: '/success_return',
    terminal: true
  },

  CAPTURE_ERROR: {
    view: 'errors/incorrect-state/capture-failure',
    analyticsPage: '/capture_failure',
    terminal: true
  },

  CAPTURE_FAILURE: {
    view: 'errors/incorrect-state/capture-failure',
    analyticsPage: '/capture_failure',
    terminal: true
  },

  AUTHORISATION_3DS_REQUIRED: {
    view: 'errors/incorrect-state/auth-3ds-required',
    analyticsPage: '/3ds_required'
  },

  AUTHORISATION_SUCCESS: {
    view: 'errors/incorrect-state/auth-success',
    analyticsPage: '/in_progress'
  },

  AUTHORISATION_REJECTED: {
    view: 'errors/incorrect-state/auth-failure',
    analyticsPage: '/auth_failure',
    terminal: true
  },

  AUTHORISATION_CANCELLED: {
    view: 'errors/incorrect-state/auth-failure',
    analyticsPage: '/auth_failure',
    terminal: true
  },

  AUTHORISATION_ERROR: {
    view: 'errors/system-error',
    analyticsPage: '/error',
    terminal: true,
    shouldLogErrorPageShown: true
  },

  AUTHORISATION_READY: {
    view: 'errors/incorrect-state/auth-waiting',
    analyticsPage: '/in_progress'
  },

  CAPTURE_READY: {
    view: 'errors/incorrect-state/capture-waiting',
    analyticsPage: '/in_progress'
  },

  ENTERING_CARD_DETAILS: {
    view: 'errors/incorrect-state/enter-card-details',
    analyticsPage: '/in_progress'
  },

  AWAITING_CAPTURE_REQUEST: {
    view: 'errors/charge-confirm-state-completed',
    locals: { status: 'successful' },
    analyticsPage: '/success_return',
    terminal: true
  }
}

exports.errorResponse = function errorReponse (req, res, reason, options = {}, error) {
  const action = actions.ERROR
  logErrorPageShown(action.view, reason, getLoggingFields(req), error)
  options.viewName = 'ERROR'
  redirectOrRender(req, res, actions.ERROR, options)
}

exports.systemErrorResponse = function systemErrorResponse (req, res, reason, options = {}, error) {
  const action = actions.SYSTEM_ERROR
  logErrorPageShown(action.view, reason, getLoggingFields(req), error)
  options.viewName = 'SYSTEM_ERROR'
  redirectOrRender(req, res, actions.SYSTEM_ERROR, options)
}

exports.response = function response (req, res, actionName, options) {
  options = options || {}
  options.viewName = actionName
  let action = lodash.result(actions, actionName)

  if (action) {
    if (action.shouldLogErrorPageShown) {
      logErrorPageShown(action.view, `Action: ${actionName}`, getLoggingFields(req))
    }
  } else {
    options = { viewName: 'error' }
    action = actions.ERROR
    logErrorPageShown(action.view, `Response action ${actionName} NOT FOUND`, getLoggingFields(req))
  }
  redirectOrRender(req, res, action, options)
}

function logErrorPageShown (page, reason, loggingFields, error) {
  logger.info('Rendering error response', {
    page,
    reason,
    error,
    ...loggingFields
  })
}

function redirectOrRender (req, res, action, options) {
  if (shouldRedirect(req, res, action)) {
    res.redirect(req.chargeData.return_url)
  } else {
    render(res, action, options)
  }
}

function shouldRedirect (req, res, action) {
  const directRedirectEnabled = lodash.get(res, 'locals.service.redirectToServiceImmediatelyOnTerminalState', false)
  return (action.terminal && directRedirectEnabled && req.chargeData)
}

function render (res, action, options) {
  options = (action.locals) ? lodash.merge({}, action.locals, options) : options
  if (lodash.get(options, 'analytics.path')) {
    options.analytics.path = options.analytics.path + lodash.get(action, 'analyticsPage', '')
  }
  res.status(action.code || 200)
  res.render(action.view, options)
}
