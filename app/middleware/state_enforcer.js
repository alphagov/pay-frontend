var stateCheck  = require('../utils/state_check.js');
var views       = require('../utils/views.js');
var _views      = views.create({});
var ENTERING_CARD_DETAILS_STATUS = 'ENTERING CARD DETAILS';
var AUTH_SUCCESS_STATE = 'AUTHORISATION SUCCESS';
var CREATED_STATE = 'CREATED';


// these are the named routes from paths.js
var states = {
  "card.new": [ENTERING_CARD_DETAILS_STATUS,CREATED_STATE],
  "card.create": [ENTERING_CARD_DETAILS_STATUS],
  "card.confirm":[AUTH_SUCCESS_STATE],
  "card.capture":[AUTH_SUCCESS_STATE],

}

module.exports = function(req,res,next){
  var stateCorrect = stateCheck(res,
    {
      correctStates:states[req.actionName],
      currentState:req.chargeData.status,
      views:_views,
      locals: {
        chargeId: req.chargeId,
        returnUrl: req.chargeData.return_url
      }
    }
  );
  if (!stateCorrect) return;
  next();
}
