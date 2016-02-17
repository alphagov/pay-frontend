var logger  = require('winston');
var _       = require('lodash');

module.exports.NOT_FOUND = {
  code: 404,
  view: 'error',
  locals: {
    message: "Page cannot be found"
  }
}

module.exports.ERROR = {
  code: 500,
  view: 'error',
  locals: {
    message: 'There is a problem with the payments platform'
  }
}

module.exports.display =  function(res,state,locals){
  if (!this[state]) {
    logger.error("VIEW " + state + " NOT FOUND");
    locals = { message: "View " + state + " not found" };
    state = "ERROR";
  }
  _.merge(this[state].locals,locals);
  locals = (this[state].locals) ? _.merge(this[state].locals,locals) : locals;
  locals = (locals == undefined) ? {} : locals;
  status = (this[state].code) ? this[state].code : 200;
  locals.viewName = this[state].view;
  res.status(status);
  res.render(this[state].view,locals);
}

