'use strict'

const logger = require('./logger')(__filename)

exports.logRequestStart = (context, loggingFields = {}) => {
  logger.info(`Calling ${context.service} ${context.description}`, {
    ...loggingFields,
    service: context.service,
    method: context.method,
    url: context.url
  })
}
exports.logRequestEnd = (context, loggingFields = {}) => {
  const duration = new Date() - context.startTime
  logger.info(`[${context.correlationId}] - ${context.method} to ${context.url} ended - elapsed time: ${duration} ms`,
    loggingFields)
}
exports.logRequestFailure = (context, response, loggingFields = {}) => {
  logger.error(`[${context.correlationId}] Calling ${context.service} to ${context.description} failed`, {
    ...loggingFields,
    service: context.service,
    method: context.method,
    url: context.url,
    status: response.statusCode
  })
}
exports.logRequestError = (context, error, loggingFields = {}) => {
  logger.error(`[${context.correlationId}] Calling ${context.service} to ${context.description} threw exception`, {
    ...loggingFields,
    service: context.service,
    method: context.method,
    url: context.url,
    error: error
  })
}
