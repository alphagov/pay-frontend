'use strict'

const logger = require('../utils/logger')(__filename)
const { getLoggingFields } = require('../utils/logging-fields-helper')
const Charge = require('../models/charge')
const responseRouter = require('../utils/response-router')
const { CORRELATION_HEADER } = require('../../config/correlation-header')
const { withAnalyticsError } = require('../utils/analytics')
const { createChargeIdSessionKey } = require('../utils/session')
const cookies = require('../utils/cookies')
const crypto = require('crypto')
const { getRequestCorrelationIDField } = require('../services/clients/base/request-context')

exports.return = (req, res) => {
  const correlationId = req.headers[CORRELATION_HEADER] || getRequestCorrelationIDField() || crypto.randomBytes(16).toString('hex')
  const charge = Charge(correlationId)
  const chargeKey = createChargeIdSessionKey(req.chargeId)
  const chargeState = cookies.getSessionChargeState(req, chargeKey)
  if (chargeState) {
    chargeState.markTerminal()
    cookies.setSessionChargeState(req, chargeKey, chargeState)
  } else {
    logger.error(`Session charge [${chargeKey}] could not be marked terminal`, {
      ...getLoggingFields(req)
    })
  }
  if (charge.isCancellableCharge(req.chargeData.status)) {
    return charge.cancel(req.chargeId, getLoggingFields(req))
      .then(() => logger.warn('Return controller cancelled payment', getLoggingFields(req)))
      .then(() => res.redirect(req.chargeData.return_url))
      .catch((err) => {
        responseRouter.systemErrorResponse(req, res, 'Return controller failed to cancel payment', withAnalyticsError(), err)
      })
  } else {
    return res.redirect(req.chargeData.return_url)
  }
}
