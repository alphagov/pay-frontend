'use strict'

// NPM dependencies
const AWSXRay = require('aws-xray-sdk')
const { getNamespace } = require('continuation-local-storage')
const {
  PAYMENT_EXTERNAL_ID,
  GATEWAY_ACCOUNT_ID,
  GATEWAY_ACCOUNT_TYPE,
  PROVIDER
} = require('@govuk-pay/pay-js-commons').logging.keys

// Local dependencies
const logger = require('../utils/logger')(__filename)
const responseRouter = require('../utils/response_router')
const Charge = require('../models/charge')
const chargeParam = require('../services/charge_param_retriever')
const { CORRELATION_HEADER } = require('../../config/correlation_header')
const withAnalyticsError = require('../utils/analytics').withAnalyticsError
const { setLoggingField, getLoggingFields } = require('../utils/logging_fields_helper')

// Constants
const clsXrayConfig = require('../../config/xray-cls')

module.exports = (req, res, next) => {
  const chargeId = chargeParam.retrieve(req)
  setLoggingField(req, PAYMENT_EXTERNAL_ID, chargeId)

  const namespace = getNamespace(clsXrayConfig.nameSpaceName)
  const clsSegment = namespace.get(clsXrayConfig.segmentKeyName)
  if (!chargeId) {
    responseRouter.response(req, res, 'UNAUTHORISED', withAnalyticsError())
  } else {
    req.chargeId = chargeId
    AWSXRay.captureAsyncFunc('Charge_find', (subsegment) => {
      Charge(req.headers[CORRELATION_HEADER]).find(chargeId)
        .then(data => {
          subsegment.close()
          req.chargeData = data
          setLoggingField(req, GATEWAY_ACCOUNT_ID, data.gateway_account.gateway_account_id)
          setLoggingField(req, GATEWAY_ACCOUNT_TYPE, data.gateway_account.type)
          setLoggingField(req, PROVIDER, data.gateway_account.payment_provider)
          next()
        })
        .catch((err) => {
          subsegment.close('error')
          logger.error('Error finding charge in middleware: ' + err, getLoggingFields(req))
          responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalyticsError())
        })
    }, clsSegment)
  }
}
