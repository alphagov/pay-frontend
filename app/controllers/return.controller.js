'use strict'

const logger = require('../utils/logger')(__filename)
const { getLoggingFields } = require('../utils/logging-fields-helper')
const Charge = require('../models/charge')
const responseRouter = require('../utils/response-router')
const { CORRELATION_HEADER } = require('../../config/correlation-header')
const { withAnalyticsError } = require('../utils/analytics')
const { createChargeIdSessionKey } = require('../utils/session')
const cookies = require('../utils/cookies')

exports.return = (req, res) => {
  const correlationId = req.headers[CORRELATION_HEADER] || ''
  const charge = Charge(correlationId)
  const chargeKey = createChargeIdSessionKey(req.chargeId)
  const chargeState = cookies.getSessionChargeState(req, chargeKey)
  if (chargeState) {
    chargeState.markTerminal()
    cookies.setSessionChargeState(req, chargeKey, chargeState)
  } else {
    /* TODO: remove after PP-12546 has been merged
    /  we no longer need to delete the session variable in the return controller as the cookie is cleaned up in the
    /  secure controller, we're just cleaning up any existing payment journeys prior to the merge of PP-12546
    */
    cookies.deleteSessionVariable(req, chargeKey)
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
