'use strict'

const { PAYMENT_EXTERNAL_ID } = require('@govuk-pay/pay-js-commons').logging.keys
const logger = require('../utils/logger')(__filename)
const { setLoggingField, getLoggingFields } = require('../utils/logging_fields_helper')
const cookie = require('../utils/cookies')

exports.retrieve = req => {
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
  return chargeId
}
