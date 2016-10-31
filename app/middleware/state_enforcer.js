var views         = require('../utils/views.js');
var _views        = views.create({});
var _             = require('lodash');
var stateService  = require('../services/state_service.js');
var paths         = require('../paths.js');

var ANALYTICS_ERROR = require('../utils/analytics.js').ANALYTICS_ERROR;
module.exports = function(req,res,next){
  'use strict';

  var correctStates = stateService.resolveStates(req.actionName);
  var currentState      = req.chargeData.status,
  locals            = {
    chargeId: req.chargeId,
    returnUrl: paths.generateRoute('card.return', {chargeId: req.chargeId}),
    analytics: ANALYTICS_ERROR.analytics
  };

  var init = function(){

    if (!stateCorrect()) return;
    next();
  };

  var stateCorrect = function(){
    var chargeOK = ischargeSessionOK();
    if (!chargeOK) {
      var stateName = currentState.toUpperCase().replace(/\s/g, "_");
      _views.display(res, stateName, locals);
      return false;
    }
    return true;
  },

  ischargeSessionOK = function(){
    return _.includes(correctStates,currentState);
  };

  return init();
};
