'use strict'

// NPM dependencies
const {
  GATEWAY_ACCOUNT_ID,
  GATEWAY_ACCOUNT_TYPE,
  PROVIDER
} = require('@govuk-pay/pay-js-commons').logging.keys

// Local dependencies
const Charge = require('../models/charge')
const { CORRELATION_HEADER } = require('../../config/correlation-header')
const withAnalyticsError = require('../utils/analytics').withAnalyticsError
const responseRouter = require('../utils/response-router')
const { setLoggingField, getLoggingFields } = require('../utils/logging-fields-helper')

module.exports = (req, res, next) => {
  const chargeId = req.params.chargeId ? req.params.chargeId : req.body.chargeId
  req.chargeId = chargeId
  Charge(req.headers[CORRELATION_HEADER]).find(chargeId, getLoggingFields(req))
    .then(data => {
      req.chargeData = data
      setLoggingField(req, GATEWAY_ACCOUNT_ID, data.gateway_account.gateway_account_id)
      setLoggingField(req, GATEWAY_ACCOUNT_TYPE, data.gateway_account.type)
      setLoggingField(req, PROVIDER, data.payment_provider)
      next()
    })
    .catch((err) => {
      responseRouter.systemErrorResponse(req, res, 'Error finding charge in middleware', withAnalyticsError(), err)
    })
}
