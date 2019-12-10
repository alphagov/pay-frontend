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
exports.logRequestEnd = (context, statusCode, loggingFields = {}) => {
  const duration = new Date() - context.startTime
  logger.info(`${context.method} to ${context.url} ended`, {
    ...loggingFields,
    service: context.service,
    method: context.method,
    url: context.url,
    response_time: duration,
    status_code: statusCode
  })
}
exports.logRequestFailure = (context, response, loggingFields = {}) => {
  logger.error(`Calling ${context.service} to ${context.description} failed`, {
    ...loggingFields,
    service: context.service,
    method: context.method,
    url: context.url,
    status_code: response.statusCode
  })
}
exports.logRequestError = (context, error, loggingFields = {}) => {
  logger.error(`Calling ${context.service} to ${context.description} threw exception`, {
    ...loggingFields,
    service: context.service,
    method: context.method,
    url: context.url,
    error: error
  })
}
