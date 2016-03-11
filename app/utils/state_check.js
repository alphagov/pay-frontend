var _             = require('lodash');
var querystring   = require('querystring');

module.exports = function(res,params) {
  var correctStates = params.correctStates,
  currentState      = params.currentState,
  views             = params.views,
  locals            = params.locals,
  res               = res;
  var init = function(){
    chargeOK = ischargeSessionOK();
    if (!chargeOK) {
      var stateName = currentState.toUpperCase().replace(" ", "_");
      views.display(res, stateName, locals);
      return false
    }
    return true
  },
  ischargeSessionOK = function(){
    return _.includes(correctStates,currentState)
  };

  return init();
};

