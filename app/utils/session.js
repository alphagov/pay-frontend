const cookie = require('../utils/cookies')

function createChargeIdSessionKey (chargeId) {
  return 'ch_' + chargeId
}

function retrieve (req, chargeId) {
  return cookie.getSessionVariable(req, createChargeIdSessionKey(chargeId))
}

module.exports = {
  retrieve: retrieve,
  createChargeIdSessionKey: createChargeIdSessionKey
}
