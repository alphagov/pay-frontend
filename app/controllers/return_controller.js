'use strict'

// npm dependencies
const logger = require('winston')

// local dependencies
const Charge = require('../models/charge.js')
const StateModel = require('../models/state.js')
const views = require('../utils/views.js')
const CORRELATION_HEADER = require('../utils/correlation_header.js').CORRELATION_HEADER
const withAnalyticsError = require('../utils/analytics.js').withAnalyticsError

// constants
const CANCELABLE_STATES = [
  StateModel.CREATED,
  StateModel.ENTERING_CARD_DETAILS,
  StateModel.AUTH_SUCCESS,
  StateModel.AUTH_READY,
  StateModel.CAPTURE_READY,
  StateModel.AUTH_3DS_REQUIRED,
  StateModel.AUTH_3DS_READY
]

exports.return = (req, res) => {
  const correlationId = req.headers[CORRELATION_HEADER] || ''
  if (CANCELABLE_STATES.includes(req.chargeData.status)) {
    return Charge(correlationId).cancel(req.chargeId)
      .then(() => logger.warn('Return controller cancelled payment', {'chargeId': req.chargeId}))
      .then(() => res.redirect(req.chargeData.return_url))
      .catch(() => {
        logger.error('Return controller failed to cancel payment', {'chargeId': req.chargeId})
        views.display(res, 'SYSTEM_ERROR', withAnalyticsError())
      })
  } else {
    return res.redirect(req.chargeData.return_url)
  }
}
