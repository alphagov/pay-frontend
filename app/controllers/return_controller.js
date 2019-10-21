'use strict'

const logger = require('../utils/logger')(__filename)
const logging = require('../utils/logging')
const Charge = require('../models/charge')
const responseRouter = require('../utils/response_router')
const { CORRELATION_HEADER } = require('../../config/correlation_header')
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
    return charge.cancel(req.chargeId)
      .then(() => logger.warn('Return controller cancelled payment', { 'chargeId': req.chargeId }))
      .then(() => res.redirect(req.chargeData.return_url))
      .catch(() => {
        logger.error('Return controller failed to cancel payment', { 'chargeId': req.chargeId })
        logging.systemError('Cancelling charge on return', correlationId, req.chargeId)
        responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalyticsError())
      })
  } else {
    return res.redirect(req.chargeData.return_url)
  }
}
