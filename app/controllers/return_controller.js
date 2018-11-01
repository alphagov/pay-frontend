'use strict'

// npm dependencies
const logger = require('winston')

// local dependencies
const Charge = require('../models/charge')
const views = require('../utils/views')
const CORRELATION_HEADER = require('../utils/correlation_header').CORRELATION_HEADER
const withAnalyticsError = require('../utils/analytics').withAnalyticsError

exports.return = (req, res) => {
  const correlationId = req.headers[CORRELATION_HEADER] || ''
  const charge = Charge(correlationId)
  if (charge.isCancellableCharge(req.chargeData.status)) {
    return charge.cancel(req.chargeId)
      .then(() => logger.warn('Return controller cancelled payment', {'chargeId': req.chargeId}))
      .then(() => res.redirect(req.chargeData.return_url))
      .catch(() => {
        logger.error('Return controller failed to cancel payment', {'chargeId': req.chargeId})
        views.display(req, res, 'SYSTEM_ERROR', withAnalyticsError())
      })
  } else {
    return res.redirect(req.chargeData.return_url)
  }
}
