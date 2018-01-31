var Charge = require('../models/charge.js')
var StateModel = require('../models/state.js')
var views = require('../utils/views.js')
var CORRELATION_HEADER = require('../utils/correlation_header.js').CORRELATION_HEADER
var withAnalyticsError = require('../utils/analytics.js').withAnalyticsError

var logger = require('winston')

let CANCELABLE_STATES = [
  StateModel.CREATED,
  StateModel.ENTERING_CARD_DETAILS,
  StateModel.AUTH_SUCCESS,
  StateModel.AUTH_READY,
  StateModel.CAPTURE_READY,
  StateModel.AUTH_3DS_REQUIRED,
  StateModel.AUTH_3DS_READY
]

exports.return = function (req, res) {
  'use strict'

  let correlationId = req.headers[CORRELATION_HEADER] || ''
  let _views = views.create({})
  let doRedirect = () => res.redirect(req.chargeData.return_url)
  let chargeModel = Charge(correlationId)

  if (CANCELABLE_STATES.includes(req.chargeData.status)) {
    return chargeModel.cancel(req.chargeId)
      .then(() => logger.warn('Return controller cancelled payment', {'chargeId': req.chargeId}))
      .then(doRedirect)
      .catch(() => {
        logger.error('Return controller failed to cancel payment', {'chargeId': req.chargeId})
        _views.display(res, 'SYSTEM_ERROR', withAnalyticsError())
      })
  } else {
    return doRedirect()
  }
}
