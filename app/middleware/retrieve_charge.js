'use strict'

// npm dependencies
const AWSXRay = require('aws-xray-sdk')
const {getNamespace} = require('continuation-local-storage')

// local dependencies
const views = require('../utils/views')
const Charge = require('../models/charge')
const chargeParam = require('../services/charge_param_retriever')
const CORRELATION_HEADER = require('../utils/correlation_header').CORRELATION_HEADER
const withAnalyticsError = require('../utils/analytics').withAnalyticsError

// constants
const clsXrayConfig = require('../../config/xray-cls')

module.exports = (req, res, next) => {
  const chargeId = chargeParam.retrieve(req)
  const namespace = getNamespace(clsXrayConfig.nameSpaceName)
  const clsSegment = namespace.get(clsXrayConfig.segmentKeyName)
  if (!chargeId) {
    views.display(req, res, 'UNAUTHORISED', withAnalyticsError())
  } else {
    req.chargeId = chargeId
    AWSXRay.captureAsyncFunc('Charge_find', (subsegment) => {
      Charge(req.headers[CORRELATION_HEADER]).find(chargeId)
        .then(data => {
          subsegment.close()
          req.chargeData = data
          next()
        })
        .catch(() => {
          subsegment.close('error')
          views.display(req, res, 'SYSTEM_ERROR', withAnalyticsError())
        })
    }, clsSegment)
  }
}
