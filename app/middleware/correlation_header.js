'use strict'
const { getNamespace } = require('continuation-local-storage')
const { CORRELATION_ID } = require('@govuk-pay/pay-js-commons').logging.keys
const { CORRELATION_HEADER } = require('../../config/correlation_header')
const { NAMESPACE_NAME } = require('../../config/cls')

module.exports = (req, res, next) => {
  req.correlationId = req.headers[CORRELATION_HEADER] || ''
  getNamespace(NAMESPACE_NAME).set(CORRELATION_ID, req.correlationId)
  next()
}
