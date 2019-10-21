'use strict'

const logger = require('./logger')(__filename)

exports.logRequestStart = context => {
  logger.info(`Calling ${context.service}  ${context.description}-`, {
    service: context.service,
    method: context.method,
    url: context.url
  })
}
exports.logRequestEnd = context => {
  const duration = new Date() - context.startTime
  logger.info(`[${context.correlationId}] - ${context.method} to ${context.url} ended - elapsed time: ${duration} ms`)
}
exports.logRequestFailure = (context, response) => {
  logger.error(`[${context.correlationId}] Calling ${context.service} to ${context.description} failed -`, {
    service: context.service,
    method: context.method,
    url: context.url,
    status: response.statusCode
  })
}
exports.logRequestError = (context, error) => {
  logger.error(`[${context.correlationId}] Calling ${context.service} to ${context.description} threw exception -`, {
    service: context.service,
    method: context.method,
    url: context.url,
    error: error
  })
}
