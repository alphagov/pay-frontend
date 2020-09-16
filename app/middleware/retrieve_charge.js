'use strict'

// NPM dependencies
const {
  GATEWAY_ACCOUNT_ID,
  GATEWAY_ACCOUNT_TYPE,
  PROVIDER
} = require('@govuk-pay/pay-js-commons').logging.keys

// Local dependencies
const responseRouter = require('../utils/response_router')
const Charge = require('../models/charge')
const chargeParam = require('../services/charge_param_retriever')
const { CORRELATION_HEADER } = require('../../config/correlation_header')
const withAnalyticsError = require('../utils/analytics').withAnalyticsError
const { setLoggingField, getLoggingFields } = require('../utils/logging_fields_helper')

function requireValidCookieSession (req, res, next) {
  const chargeId = chargeParam.retrieve(req)
  if (!chargeId) {
    responseRouter.response(req, res, 'UNAUTHORISED', withAnalyticsError())
  } else {
    next()
  }
}

function fetchChargeDetails (req, res, next) {
  const chargeId = chargeParam.retrieve(req)
  req.chargeId = chargeId
  Charge(req.headers[CORRELATION_HEADER]).find(chargeId, getLoggingFields(req))
    .then(data => {
      req.chargeData = data
      setLoggingField(req, GATEWAY_ACCOUNT_ID, data.gateway_account.gateway_account_id)
      setLoggingField(req, GATEWAY_ACCOUNT_TYPE, data.gateway_account.type)
      setLoggingField(req, PROVIDER, data.gateway_account.payment_provider)
      next()
    })
    .catch((err) => {
      responseRouter.systemErrorResponse(req, res, 'Error finding charge in middleware', withAnalyticsError(), err)
    })
}

module.exports = {
  requireValidCookieSession,
  fetchChargeDetails
}
