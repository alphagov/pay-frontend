var logger  = require('winston');
var _       = require('lodash');


module.exports = function(){

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
        message: 'There is a problem with the payments platform'
      }
    },
    SESSION_INCORRECT: {
      code: 200,
      view: 'error',
      locals: {
        message: 'Session expired'
      }
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

    CAPTURED: {
      view: "errors/charge_confirm_state_completed",
      locals: { status: 'successful' }
    },
    CAPTURE_FAILURE: {
      view: "errors/charge_confirm_state_completed",
      locals: { status: 'unsuccessful' }
    },
    AUTHORISATION_SUCCESS: {
        view: "errors/incorrect_state/auth_success"
    },
    AUTHORISATION_REJECTED: {
        view: "errors/incorrect_state/auth_failure"
    },
    display: function(res,resName,locals){
      var action = _.cloneDeep(_.result(this, resName));
      locals = (locals == undefined) ? {} : locals;
      locals.viewName = resName;

      if (!action) {
        logger.error("VIEW " + resName + " NOT FOUND");
        locals = { message: "View " + resName + " not found" };
        locals.viewName = 'error';
        action = _.cloneDeep(this.error);
      }

      locals = (action.locals) ? _.merge(_.cloneDeep(action.locals),locals) : locals;
      status = (action.code) ? action.code : 200;
      res.status(status);
      res.render(action.view,locals);
    }
  },

  create = function(localViews) {
    localViews = (localViews == undefined) ? {} : _.cloneDeep(localViews);
    var copied_defaults = _.cloneDeep(_default);
    return _.merge(copied_defaults,localViews);
  };

  return {
    create: create
  };

}();
