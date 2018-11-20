'use strict'

// NPM dependencies
const logger = require('winston')

// Constants
const {CORRELATION_HEADER} = require('../../config/correlation_header')

const withCorrelationHeader = (args, correlationId) => {
  correlationId = correlationId || ''
  if (correlationId === '') {
    logger.warn('Missing correlation ID header [X-Request-Id] in request.')
  }
  args = args || {}
  args.headers = args.headers || {}
  args.headers[CORRELATION_HEADER] = correlationId
  return args
}

module.exports = {
  withCorrelationHeader,
  CORRELATION_HEADER
}
