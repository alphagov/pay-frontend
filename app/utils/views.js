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
    display: function(res,resName,locals){
      if (!this[resName]) {
        logger.error("VIEW " + resName + " NOT FOUND");
        locals = { message: "View " + resName + " not found" };
        resName = "ERROR";
      }

      locals = (locals == undefined) ? {} : locals;
      locals = (this[resName].locals) ? _.merge(this[resName].locals,locals) : locals;
      status = (this[resName].code) ? this[resName].code : 200;
      locals.viewName = this[resName].view;
      res.status(status);
      res.render(this[resName].view,locals);
    }
  },

  create = function(localViews) {
    localViews = (localViews == undefined) ? {} : _.cloneDeep(localViews);
    var copied_defaults = _.cloneDeep(_default);
    return _.merge(copied_defaults,localViews);
  };

  return {
    create: create
  }

}();
