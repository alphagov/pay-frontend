'use strict'

// NPM dependencies
const logger = require('winston')

// Local dependencies
const Charge = require('../models/charge')
const responseRouter = require('../utils/response_router')
const {CORRELATION_HEADER} = require('../../config/correlation_header')
const {withAnalyticsError} = require('../utils/analytics')

exports.return = (req, res) => {
  const correlationId = req.headers[CORRELATION_HEADER] || ''
  const charge = Charge(correlationId)
  if (charge.isCancellableCharge(req.chargeData.status)) {
    return charge.cancel(req.chargeId)
      .then(() => logger.warn('Return controller cancelled payment', {'chargeId': req.chargeId}))
      .then(() => res.redirect(req.chargeData.return_url))
      .catch(() => {
        logger.error('Return controller failed to cancel payment', {'chargeId': req.chargeId})
        responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalyticsError())
      })
  } else {
    return res.redirect(req.chargeData.return_url)
  }
}
