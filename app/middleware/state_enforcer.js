var views       = require('../utils/views.js');
var _views      = views.create({});
var _             = require('lodash');
var stateService  = require('../services/state_service.js')

module.exports = function(req,res,next){
  var correctStates = stateService.resolveStates(req.actionName),
  currentState      = req.chargeData.status,
  locals            = {
    chargeId: req.chargeId,
    returnUrl: req.chargeData.return_url
  };

  var init = function(){
    if (!stateCorrect()) return;
    next();
  };

  var stateCorrect = function(){
    chargeOK = ischargeSessionOK();
    if (!chargeOK) {
      var stateName = currentState.toUpperCase().replace(" ", "_");
      _views.display(res, stateName, locals);
      return false;
    }
    return true;
  },

  ischargeSessionOK = function(){
    return _.includes(correctStates,currentState);
  };

  return init();
}
