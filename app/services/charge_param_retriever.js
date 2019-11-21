'use strict'

const logger = require('../utils/logger')(__filename)
const cookie = require('../utils/cookies')

exports.retrieve = req => {
  const chargeId = req.params.chargeId ? req.params.chargeId : req.body.chargeId

  if (!chargeId) {
    logger.error('ChargeId was not found in request', {
      chargeId: 'undefined'
    })
    return false
  } else if (!cookie.getSessionCookieName() || !cookie.isSessionPresent(req)) {
    logger.error('Session cookie is not present', {
      chargeId: chargeId,
      referrer: req.get('Referrer'),
      url: req.originalUrl,
      method: req.method
    })
    return false
  } else if (!cookie.getSessionVariable(req, 'ch_' + chargeId)) {
    logger.error('ChargeId was not found on the session', {
      chargeId: chargeId,
      referrer: req.get('Referrer'),
      url: req.originalUrl,
      method: req.method,
      session_keys: cookie.getSessionVariableNames(req)
    })
    return false
  }
  return chargeId
}
