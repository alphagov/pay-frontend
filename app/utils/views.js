var logger  = require('winston');
var _       = require('lodash');


module.exports = function() {
  'use strict';

  var _default = {
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
    SYSTEM_ERROR: {
      code: 500,
      view: 'errors/system_error',
    },
    CAPTURE_SUBMITTED: {
      view: "errors/charge_confirm_state_completed",
      locals: { status: 'successful' }
    },
    EXPIRED: {
      view: "errors/incorrect_state/session_expired"
    },
    SYSTEM_CANCELLED: {
      view: "errors/incorrect_state/system_cancelled"
    },

    USER_CANCELLED: {
      view: "user_cancelled",
      locals: { status: 'successful' }
    },

    CAPTURED: {
      view: "errors/charge_confirm_state_completed",
      locals: { status: 'successful' }
    },

    CAPTURE_FAILURE: {
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

    ENTERING_CARD_DETAILS: {
      view: "errors/system_error"
    },

    display: function(res, resName, locals) {
      var action = _.result(this, resName);
      var status;

      locals = locals || {};
      locals.viewName = resName;

      if (!action) {
        logger.error("VIEW " + resName + " NOT FOUND");
        locals = { message: "View " + resName + " not found" };
        locals.viewName = 'error';
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
