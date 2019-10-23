'use strict'

const lodash = require('lodash')
const logger = require('./logger')(__filename)

const expired = {
  view: 'errors/incorrect_state/session_expired',
  analyticsPage: '/session_expired',
  terminal: true
}

const systemCancelled = {
  view: 'errors/incorrect_state/system_cancelled',
  analyticsPage: '/system_cancelled',
  terminal: true
}

const userCancelled = {
  view: 'user_cancelled',
  locals: { status: 'successful' },
  analyticsPage: '/user_cancelled',
  terminal: true
}

const systemError = {
  code: 500,
  view: 'errors/system_error',
  analyticsPage: '/error',
  terminal: true
}

const error = {
  code: 500,
  view: 'error',
  locals: {
    message: 'There is a problem, please try again later'
  },
  analyticsPage: '/error',
  terminal: true
}

const actions = {
  auth_3ds_required: {
    view: 'auth_3ds_required',
    analyticsPage: '/3ds_required'
  },
  auth_3ds_required_in: {
    view: 'auth_3ds_required_in',
    analyticsPage: '/3ds_required'
  },
  auth_3ds_required_out: {
    view: 'auth_3ds_required_out',
    analyticsPage: '/3ds_required'
  },
  auth_3ds_required_html_out: {
    view: 'auth_3ds_required_html_out',
    analyticsPage: '/3ds_required'
  },
  auth_waiting: {
    view: 'auth_waiting',
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
    view: 'capture_waiting',
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
    terminal: true
  },

  SESSION_INCORRECT: {
    code: 422,
    view: 'errors/incorrect_state/session_expired',
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
    terminal: true
  },

  HUMANS: {
    code: 200,
    view: 'plain_message',
    locals: {
      message: 'GOV.UK Payments is built by a team at the Government Digital Service in London. If you\'d like to join us, see https://gds.blog.gov.uk/jobs'
    }
  },

  UNAUTHORISED: {
    code: 403,
    view: 'errors/incorrect_state/session_expired',
    terminal: true
  },

  CAPTURE_SUBMITTED: {
    view: 'errors/charge_confirm_state_completed',
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
    view: 'errors/charge_confirm_state_completed',
    locals: { status: 'successful' },
    analyticsPage: '/success_return',
    terminal: true
  },

  CAPTURE_APPROVED: {
    view: 'errors/charge_confirm_state_completed',
    locals: { status: 'successful' },
    analyticsPage: '/success_return',
    terminal: true
  },

  CAPTURE_APPROVED_RETRY: {
    view: 'errors/charge_confirm_state_completed',
    locals: { status: 'successful' },
    analyticsPage: '/success_return',
    terminal: true
  },

  CAPTURE_ERROR: {
    view: 'errors/incorrect_state/capture_failure',
    analyticsPage: '/capture_failure',
    terminal: true
  },

  CAPTURE_FAILURE: {
    view: 'errors/incorrect_state/capture_failure',
    analyticsPage: '/capture_failure',
    terminal: true
  },

  AUTHORISATION_3DS_REQUIRED: {
    view: 'errors/incorrect_state/auth_3ds_required',
    analyticsPage: '/3ds_required'
  },

  AUTHORISATION_SUCCESS: {
    view: 'errors/incorrect_state/auth_success',
    analyticsPage: '/in_progress'
  },

  AUTHORISATION_REJECTED: {
    view: 'errors/incorrect_state/auth_failure',
    analyticsPage: '/auth_failure',
    terminal: true
  },

  AUTHORISATION_CANCELLED: {
    view: 'errors/incorrect_state/auth_failure',
    analyticsPage: '/auth_failure',
    terminal: true
  },

  AUTHORISATION_ERROR: {
    view: 'errors/system_error',
    analyticsPage: '/error',
    terminal: true
  },

  AUTHORISATION_READY: {
    view: 'errors/incorrect_state/auth_waiting',
    analyticsPage: '/in_progress'
  },

  CAPTURE_READY: {
    view: 'errors/incorrect_state/capture_waiting',
    analyticsPage: '/in_progress'
  },

  ENTERING_CARD_DETAILS: {
    view: 'errors/incorrect_state/enter_card_details',
    analyticsPage: '/in_progress'
  },

  AWAITING_CAPTURE_REQUEST: {
    view: 'errors/charge_confirm_state_completed',
    locals: { status: 'successful' },
    analyticsPage: '/success_return',
    terminal: true
  }
}

exports.response = (req, res, actionName, options) => {
  options = options || {}
  options.viewName = actionName
  let action = lodash.result(actions, actionName)
  if (!action) {
    logger.error('Response action ' + actionName + ' NOT FOUND')
    options = { viewName: 'error' }
    action = actions.ERROR
  }
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
