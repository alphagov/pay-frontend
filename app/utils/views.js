var logger  = require('winston');
var _       = require('lodash');


module.exports = function() {
  'use strict';

  var expired = {
      view: "errors/incorrect_state/session_expired"
    },

    systemCancelled = {
      view: "errors/incorrect_state/system_cancelled"
    },

    userCancelled = {
      view: "user_cancelled",
      locals: { status: 'successful' }
    },

    authorisation3dsRequired = {
      view: "auth_3ds_required"
    },

    authorisation3dsRequiredOut = {
      view: "auth_3ds_required_out"
    },

    authorisation3dsRequiredIn = {
      view: "auth_3ds_required_in"
    },

    systemError = {
      code: 500,
      view: 'errors/system_error'
    },

    error = {
      code: 500,
      view: 'error',
      locals: {
        message: 'There is a problem, please try again later'
      }
    },

    _default = {
      NOT_FOUND: {
        code: 404,
        view: 'error',
        locals: {
          message: "Page cannot be found"
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
        view: "errors/incorrect_state/session_expired"
      },

      SYSTEM_ERROR: systemError,

      NAXSI_SYSTEM_ERROR: {
        code: 400,
        view: 'error',
        locals : {
          message: "Please try again later"
        }
      },

      HUMANS: {
        code: 200,
        view: 'plain_message',
        locals : {
          message: "GOV.UK Payments is built by a team at the Government Digital Service in London. If you'd like to join us, see https://gds.blog.gov.uk/jobs"
        }
      },

      UNAUTHORISED: {
        code: 403,
        view: 'errors/system_error',
      },

      CAPTURE_SUBMITTED: {
        view: "errors/charge_confirm_state_completed",
        locals: { status: 'successful' }
      },

      CREATED: error,

      AUTHORISATION_3DS_REQUIRED: authorisation3dsRequired,

      AUTHORISATION_3DS_REQUIRED_IN: authorisation3dsRequiredIn,

      AUTHORISATION_3DS_REQUIRED_OUT: authorisation3dsRequiredOut,

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
        view: "errors/charge_confirm_state_completed",
        locals: { status: 'successful' }
      },

      CAPTURE_FAILURE: {
        view: "errors/incorrect_state/capture_failure"
      },

      CAPTURE_ERROR: {
        view: "errors/incorrect_state/capture_failure"
      },

      AUTHORISATION_SUCCESS: {
        view: "errors/incorrect_state/auth_success"
      },

      AUTHORISATION_REJECTED: {
        view: "errors/incorrect_state/auth_failure"
      },

      AUTHORISATION_ERROR: {
        view: "errors/system_error"
      },

      AUTHORISATION_READY: {
        view: "errors/incorrect_state/auth_waiting"
      },

      CAPTURE_READY: {
        view: "errors/incorrect_state/capture_waiting"
      },

      ENTERING_CARD_DETAILS: systemError,

      display: function(res, resName, locals) {
        var action = _.result(this, resName);
        var status;
        locals = locals || {};
        locals.viewName = resName;

        if (!action) {
          logger.error("VIEW " + resName + " NOT FOUND");
          locals = { viewName: 'error' };
          action = this.ERROR;
        }

        locals = (action.locals) ? _.merge({}, action.locals, locals) : locals;
        status = (action.code) ? action.code : 200;

        res.status(status);
        res.render(action.view,locals);
      }
    },

    create = function(localViews) {
      return _.merge({},_default,localViews);
    };

  return {
    create: create
  };

}();
