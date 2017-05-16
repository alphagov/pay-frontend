var logger = require('winston');
var cookie = require('../utils/cookies');

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
    if (!cookie.getSessionCookieName()) return;
    return cookie.getSessionVariable(req, createChargeIdSessionKey(chargeId));
  },

  createChargeIdSessionKey = function(chargeId) {
    return 'ch_' + chargeId;
  };

  return {
    retrieve: retrieve
  };

}();
