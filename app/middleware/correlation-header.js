'use strict'

const crypto = require('crypto')

const { CORRELATION_HEADER } = require('../../config/correlation-header')
const { setLoggingField } = require('../utils/logging-fields-helper')
const { CORRELATION_ID } = require('@govuk-pay/pay-js-commons').logging.keys

module.exports = (req, res, next) => {
  if (!req.headers[CORRELATION_HEADER]) {
    req.headers[CORRELATION_HEADER] = crypto.randomBytes(16).toString('hex')
  }

  req.correlationId = req.headers[CORRELATION_HEADER]
  setLoggingField(req, CORRELATION_ID, req.correlationId)

  next()
}
