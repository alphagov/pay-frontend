'use strict';
var _ = require('lodash');

module.exports = function() {
  var createChargeIdSessionKey = function(chargeId) {
    return 'ch_' + chargeId;
  },

  retrieve = function(req, chargeId) {
    return req.frontend_state[createChargeIdSessionKey(chargeId)];
  };

  return {
    retrieve: retrieve,
    createChargeIdSessionKey: createChargeIdSessionKey
  };
}();
