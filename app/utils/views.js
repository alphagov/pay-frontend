'use strict'

// npm dependencies
const logger = require('winston')
const lodash = require('lodash')

const expired = {
  view: 'errors/incorrect_state/session_expired',
  analyticsPage: '/session_expired'
}

const systemCancelled = {
  view: 'errors/incorrect_state/system_cancelled',
  analyticsPage: '/system_cancelled'
}

const userCancelled = {
  view: 'user_cancelled',
  locals: {status: 'successful'},
  analyticsPage: '/user_cancelled'
}

const systemError = {
  code: 500,
  view: 'errors/system_error',
  analyticsPage: '/error'
}

const error = {
  code: 500,
  view: 'error',
  locals: {
    message: 'There is a problem, please try again later'
  },
  analyticsPage: '/error'
}

module.exports = {
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
    }
  },
  ERROR: {
    code: 500,
    view: 'error',
    locals: {
      message: 'There is a problem, please try again later'
    }
  },

  SESSION_INCORRECT: {
    code: 422,
    view: 'errors/incorrect_state/session_expired',
    analyticsPage: '/problem'
  },

  SYSTEM_ERROR: systemError,

  NAXSI_SYSTEM_ERROR: {
    code: 400,
    view: 'error',
    locals: {
      message: 'Please try again later'
    }
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
    view: 'errors/incorrect_state/session_expired'
  },

  CAPTURE_SUBMITTED: {
    view: 'errors/charge_confirm_state_completed',
    locals: {status: 'successful'},
    analyticsPage: '/success_return'
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
    locals: {status: 'successful'},
    analyticsPage: '/success_return'
  },

  CAPTURE_APPROVED: {
    view: 'errors/charge_confirm_state_completed',
    locals: {status: 'successful'},
    analyticsPage: '/success_return'
  },

  CAPTURE_APPROVED_RETRY: {
    view: 'errors/charge_confirm_state_completed',
    locals: {status: 'successful'},
    analyticsPage: '/success_return'
  },

  CAPTURE_ERROR: {
    view: 'errors/incorrect_state/capture_failure',
    analyticsPage: '/capture_failure'
  },

  CAPTURE_FAILURE: {
    view: 'errors/incorrect_state/capture_failure',
    analyticsPage: '/capture_failure'
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
    analyticsPage: '/auth_failure'
  },

  AUTHORISATION_CANCELLED: {
    view: 'errors/incorrect_state/auth_failure',
    analyticsPage: '/auth_failure'
  },

  AUTHORISATION_ERROR: {
    view: 'errors/system_error',
    analyticsPage: '/error'
  },

  AUTHORISATION_READY: {
    view: 'errors/incorrect_state/auth_waiting',
    analyticsPage: '/in_progress'
  },

  CAPTURE_READY: {
    view: 'errors/incorrect_state/capture_waiting',
    analyticsPage: '/in_progress'
  },

  ENTERING_CARD_DETAILS: systemError,

  display: function (res, viewName, options) {
    let action = lodash.result(this, viewName)
    options = options || {}
    options.viewName = viewName
    if (!action) {
      logger.error('VIEW ' + viewName + ' NOT FOUND')
      options = {viewName: 'error'}
      action = this.ERROR
    }
    options = (action.locals) ? lodash.merge({}, action.locals, options) : options

    if (lodash.get(options, 'analytics.path')) {
      options.analytics.path = options.analytics.path + lodash.get(action, 'analyticsPage', '')
    }
    res.status(action.code || 200)
    res.render(action.view, options)
  }
}
