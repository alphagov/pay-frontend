'use strict'

// local dependencies
const cookie = require('../utils/cookies')

exports.createChargeIdSessionKey = chargeId => 'ch_' + chargeId
exports.retrieve = (req, chargeId) => cookie.getSessionVariable(req, exports.createChargeIdSessionKey(chargeId))
