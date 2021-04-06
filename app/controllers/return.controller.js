'use strict'

const logger = require('../utils/logger')(__filename)
const { getLoggingFields } = require('../utils/logging-fields-helper')
const Charge = require('../models/charge')
const responseRouter = require('../utils/response-router')
const { CORRELATION_HEADER } = require('../../config/correlation-header')
const { withAnalyticsError } = require('../utils/analytics')
const cookies = require('../utils/cookies')
const { createChargeIdSessionKey } = require('../utils/session')

exports.return = (req, res) => {
  const correlationId = req.headers[CORRELATION_HEADER] || ''
  const charge = Charge(correlationId)
  // Remove the charge data from the cookie
  const cookieKey = createChargeIdSessionKey(req.chargeId)
  cookies.deleteSessionVariable(req, cookieKey)
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
