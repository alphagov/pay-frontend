'use strict';
var _ = require('lodash');

module.exports = function() {
  var createChargeIdSessionKey = function(chargeId) {
    return 'ch_' + chargeId;
  },

  retrieve = function(req, chargeId) {
    return req.frontend_state[createChargeIdSessionKey(chargeId)];
  },
  // this should get removed once these details come abck from the connector
  validForConfirm = function (chargeSession) {
    var required = ['expiryDate', 'cardNumber', 'cardholderName', 'address', 'serviceName'];

    for (var key = 0; key < required.length; key++) {
        if (!_.has(chargeSession,required[key])) return false;
    }
    return true;
  };

  return {
    retrieve: retrieve,
    validForConfirm: validForConfirm
  };
}();
