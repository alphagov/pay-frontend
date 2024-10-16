'use strict'

const requestLogger = require('./request-logger')
const { CORRELATION_HEADER } = require('../../../../config/correlation-header')
const { CORRELATION_ID } = require('@govuk-pay/pay-js-commons').logging.keys

let correlationIdFromRequest

function transformRequestAddHeaders () {
  const correlationId = correlationIdFromRequest
  const headers = {}
  if (correlationId) {
    headers[CORRELATION_HEADER] = correlationId
  }
  return headers
}

function addCorrelationIdToContext (context) {
  context = context || {}

  context.additionalLoggingFields = context.additionalLoggingFields || {}
  context.additionalLoggingFields[CORRELATION_ID] = correlationIdFromRequest

  return context
}

function onRequestStart (context) {
  addCorrelationIdToContext(context)
  requestLogger.logRequestStart(context)
}

function onSuccessResponse (context) {
  addCorrelationIdToContext(context)
  requestLogger.logRequestEnd(context)
}

function onFailureResponse (context) {
  addCorrelationIdToContext(context)
  requestLogger.logRequestEnd(context)
  requestLogger.logRequestFailure(context)
}

function configureClient (client, baseUrl, correlationId) {
  correlationIdFromRequest = correlationId

  client.configure(baseUrl, {
    transformRequestAddHeaders,
    onRequestStart,
    onSuccessResponse,
    onFailureResponse,
    acceptAllStatusCodes: true
  })
}

module.exports = {
  configureClient
}
