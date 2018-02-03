'use strict'

// local dependencies
const views = require('../utils/views.js')
const Charge = require('../models/charge.js')
const chargeParam = require('../services/charge_param_retriever.js')
const CORRELATION_HEADER = require('../utils/correlation_header.js').CORRELATION_HEADER
const withAnalyticsError = require('../utils/analytics.js').withAnalyticsError

module.exports = (req, res, next) => {
  const chargeId = chargeParam.retrieve(req)

  if (!chargeId) {
    views.display(res, 'UNAUTHORISED', withAnalyticsError())
  } else {
    req.chargeId = chargeId
    Charge(req.headers[CORRELATION_HEADER]).find(chargeId)
      .then(data => {
        req.chargeData = data
        next()
      })
      .catch(() => {
        views.display(res, 'SYSTEM_ERROR', withAnalyticsError())
      })
  }
}
