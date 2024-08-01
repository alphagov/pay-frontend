'use strict'

// Local dependencies
const { PAYMENT_EXTERNAL_ID } = require('@govuk-pay/pay-js-commons').logging.keys
const logger = require('../utils/logger')(__filename)
const { setLoggingField, getLoggingFields } = require('../utils/logging-fields-helper')
const cookies = require('../utils/cookies')

const createChargeIdSessionKey = function createChargeIdSessionKey (chargeId) {
  return 'ch_' + chargeId
}

const retrieve = function retrieve (req, chargeId) {
  return cookies.getSessionVariable(req, createChargeIdSessionKey(chargeId))
}

const validateSessionCookie = function validateSessionCookie (req) {
  const chargeId = req.params.chargeId ? req.params.chargeId : req.body.chargeId
  setLoggingField(req, PAYMENT_EXTERNAL_ID, chargeId)

  if (!chargeId) {
    logger.error('ChargeId was not found in request', getLoggingFields(req))
    return false
  }
  const chargeKey = createChargeIdSessionKey(chargeId)
  if (!cookies.getSessionCookieName() || !cookies.isSessionPresent(req)) {
    logger.info('Session cookie is not present', {
      ...getLoggingFields(req),
      referrer: req.get('Referrer'),
      url: req.originalUrl,
      method: req.method
    })
    return false
  } else if (!cookies.getSessionVariable(req, chargeKey)) {
    logger.info('ChargeId was not found on the session', {
      ...getLoggingFields(req),
      referrer: req.get('Referrer'),
      url: req.originalUrl,
      method: req.method,
      session_keys: cookies.getChargesOnSession(req)
    })
    return false
  }
  logger.info('ChargeId found on session', {
    ...getLoggingFields(req),
    number_of_payments_on_cookie: cookies.getChargesOnSession(req).length
  })
  const chargeState = cookies.getSessionChargeState(req, chargeKey)
  if (chargeState) {
    chargeState.updateAccessedAt()
    cookies.setSessionChargeState(req, createChargeIdSessionKey(chargeId), chargeState)
  } else {
    logger.error('ChargeId found on session but charge state could not be parsed', {
      ...getLoggingFields(req)
    })
  }
  return true
}

module.exports = {
  createChargeIdSessionKey,
  retrieve,
  validateSessionCookie
}
