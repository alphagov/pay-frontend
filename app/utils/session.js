'use strict'

// Local dependencies
const { PAYMENT_EXTERNAL_ID } = require('@govuk-pay/pay-js-commons').logging.keys
const logger = require('../utils/logger')(__filename)
const { setLoggingField, getLoggingFields } = require('../utils/logging-fields-helper')
const cookie = require('../utils/cookies')

const createChargeIdSessionKey = function createChargeIdSessionKey (chargeId) {
  return 'ch_' + chargeId
}

const retrieve = function retrieve (req, chargeId) {
  return cookie.getSessionVariable(req, createChargeIdSessionKey(chargeId))
}

const validateSessionCookie = function validateSessionCookie (req) {
  const chargeId = req.params.chargeId ? req.params.chargeId : req.body.chargeId
  setLoggingField(req, PAYMENT_EXTERNAL_ID, chargeId)

  if (!chargeId) {
    logger.error('ChargeId was not found in request', getLoggingFields(req))
    return false
  } else if (!cookie.getSessionCookieName() || !cookie.isSessionPresent(req)) {
    logger.info('Session cookie is not present', {
      ...getLoggingFields(req),
      referrer: req.get('Referrer'),
      url: req.originalUrl,
      method: req.method
    })
    return false
  } else if (!cookie.getSessionVariable(req, 'ch_' + chargeId)) {
    logger.info('ChargeId was not found on the session', {
      ...getLoggingFields,
      referrer: req.get('Referrer'),
      url: req.originalUrl,
      method: req.method,
      session_keys: cookie.getSessionVariableNames(req)
    })
    return false
  }
  return true
}

module.exports = {
  createChargeIdSessionKey,
  retrieve,
  validateSessionCookie
}
