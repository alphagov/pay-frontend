var logger = require('winston');

module.exports = function(){
  "use strict";

  var retrieve = function(req) {
    var chargeId = getChargeParam(req);

    if (!chargeId) {
      logger.error('ChargeId was not found in request -', {
        chargeId: 'undefined'
      });
      return false;
    }

    if (!getChargeFromSession(req, chargeId)) {
      logger.error('ChargeId was not found on the session -', {
        chargeId: chargeId
      });
      return false;
    }
    return chargeId;
  },

  getChargeParam = function(req) {
    return (req.params.chargeId) ? req.params.chargeId : req.body.chargeId;
  },

  getChargeFromSession = function(req,chargeId) {
    if (!req.frontend_state) return;
    return req.frontend_state[createChargeIdSessionKey(chargeId)];
  },

  createChargeIdSessionKey = function(chargeId) {
    return 'ch_' + chargeId;
  };

  return {
    retrieve: retrieve
  };

}();
