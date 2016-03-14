var views       = require('../utils/views.js');
var _views      = views.create({});
var ENTERING_CARD_DETAILS_STATUS = 'ENTERING CARD DETAILS';
var AUTH_SUCCESS_STATE = 'AUTHORISATION SUCCESS';
var CREATED_STATE = 'CREATED';
var _             = require('lodash');


// these are the named routes from paths.js
var states = {
  "card.new": [ENTERING_CARD_DETAILS_STATUS,CREATED_STATE],
  "card.create": [ENTERING_CARD_DETAILS_STATUS],
  "card.confirm":[AUTH_SUCCESS_STATE],
  "card.capture":[AUTH_SUCCESS_STATE],
}

module.exports = function(req,res,next){
  var correctStates = states[req.actionName],
  currentState      = req.chargeData.status,
  locals            = {
    chargeId: req.chargeId,
    returnUrl: req.chargeData.return_url
  }

  var init = function(){
    if (!correctStates) throw new Error('Cannot find correct enforcable states for action')
    if (!stateCorrect()) return;
    next();
  }

  var stateCorrect = function(){
    chargeOK = ischargeSessionOK();
    if (!chargeOK) {
      var stateName = currentState.toUpperCase().replace(" ", "_");
      _views.display(res, stateName, locals);
      return false
    }
    return true
  },

  ischargeSessionOK = function(){
    return _.includes(correctStates,currentState)
  };

  return init();
}
