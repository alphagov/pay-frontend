'use strict';

module.exports = function (req,chargeId) {
  var createChargeIdSessionKey = function(chargeId) {
    return 'ch_' + chargeId;
  },

  chargeState = function(req, chargeId) {
    return req.frontend_state[createChargeIdSessionKey(chargeId)];
  };

  return chargeState(req, chargeId);
};
