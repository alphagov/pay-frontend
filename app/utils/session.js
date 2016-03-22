'use strict';

module.exports = function (req,chargeId) {
  function createChargeIdSessionKey(chargeId) {
    return 'ch_' + chargeId;
  }

  function chargeState(req, chargeId) {
    var charge = req.frontend_state[createChargeIdSessionKey(chargeId)];
    return charge;
  }

  return chargeState(req, chargeId);
};
