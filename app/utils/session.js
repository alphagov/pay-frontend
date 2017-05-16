var cookie = require('../utils/cookies');

module.exports = function() {
  'use strict';

  var createChargeIdSessionKey = function(chargeId) {
    return 'ch_' + chargeId;
  },

  retrieve = function(req, chargeId) {
    return cookie.getSessionVariable(req, createChargeIdSessionKey(chargeId));
  };


  return {
    retrieve: retrieve,
    createChargeIdSessionKey: createChargeIdSessionKey
  };
}();
