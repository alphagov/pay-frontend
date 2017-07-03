'use strict'

var cookie = require('../utils/cookies')

module.exports = (function () {
  var createChargeIdSessionKey = function (chargeId) {
    return 'ch_' + chargeId
  }
  var retrieve = function (req, chargeId) {
    return cookie.getSessionVariable(req, createChargeIdSessionKey(chargeId))
  }
  return {
    retrieve: retrieve,
    createChargeIdSessionKey: createChargeIdSessionKey
  }
}())
