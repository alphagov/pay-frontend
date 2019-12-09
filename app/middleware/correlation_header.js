'use strict'

const { CORRELATION_ID } = require('@govuk-pay/pay-js-commons').logging.keys
const { CORRELATION_HEADER } = require('../../config/correlation_header')
const { setLoggingField } = require('../utils/logging_fields_helper')

module.exports = (req, res, next) => {
  req.correlationId = req.headers[CORRELATION_HEADER] || ''
  setLoggingField(req, CORRELATION_ID, req.correlationId)
  next()
}
