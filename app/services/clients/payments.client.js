'use strict'

const logger = require('../../utils/logger')(__filename)
const baseClient = require('./base.client/base.client')
const requestLogger = require('../../utils/request-logger')
const { getCounter } = require('../../metrics/graphite-reporter')

const METRICS_PREFIX = 'internal-rest-call.payments'
const SERVICE_NAME = 'payments'

const BASE_URL = process.env.PAYMENTS_HOST
const CORRELATION_ID = ''

/** @private */
function _getPayments (url, description, loggingFields = {}, callingFunctionName) {
  const startTime = new Date()
  const context = {
    url: url,
    method: 'GET',
    description: description,
    service: SERVICE_NAME
  }
  requestLogger.logRequestStart(context, loggingFields)
  return baseClient.get(url, { correlationId: CORRELATION_ID })
    .then(response => {
      logger.info('GET to %s ended - total time %dms', url, new Date() - startTime, loggingFields)
      incrementStatusCodeCounter(callingFunctionName, response.statusCode)
      if (response.statusCode !== 200) {
        logger.error(`Error communicating with ${url}`, {
          ...loggingFields,
          service: 'payments',
          method: 'GET',
          status_code: response.statusCode,
          url: url
        })
      }
      return response
    }).catch(err => {
      logger.info('GET to %s ended - total time %dms', url, new Date() - startTime, loggingFields)
      logger.error('Calling payments threw exception', {
        ...loggingFields,
        service: 'payments',
        method: 'GET',
        url: url,
        error: err
      })
      incrementStatusCodeCounter(callingFunctionName, 'error')
      throw err
    })
}

/** @private */
function _postPayments (url, payload, description, loggingFields = {}, callingFunctionName) {
  const startTime = new Date()
  const context = {
    url: url,
    method: 'POST',
    description: description,
    service: SERVICE_NAME
  }
  requestLogger.logRequestStart(context, loggingFields)
  return baseClient.post(
    url,
    { payload, correlationId: CORRELATION_ID }
  ).then(response => {
    logger.info('POST to %s ended - total time %dms', url, new Date() - startTime, loggingFields)
    incrementStatusCodeCounter(callingFunctionName, response.statusCode)
    if (response.statusCode > 499 && response.statusCode < 600) {
      logger.error(`Error communicating with ${url}`, {
        ...loggingFields,
        service: 'payments',
        method: 'POST',
        status_code: response.statusCode,
        url: url
      })
    }
    return response
  }).catch(err => {
    logger.info('POST to %s ended - total time %dms', url, new Date() - startTime, loggingFields)
    logger.error('Calling payments threw exception', {
      ...loggingFields,
      service: 'payments',
      method: 'POST',
      url: url,
      error: err
    })
    incrementStatusCodeCounter(callingFunctionName, 'error')
    throw err
  })
}

const incrementStatusCodeCounter = (callingFunctionName, statusCode) => {
  getCounter(`${METRICS_PREFIX}.${callingFunctionName}.${statusCode}`).inc()
}

function findByToken (tokenId, loggingFields = {}) {
  const url = BASE_URL + `/v1/token/${tokenId}`
  return _getPayments(url, 'find by token', loggingFields, 'findByToken')
}

function markTokenAsUsed (tokenId, loggingFields = {}) {
  const url = BASE_URL + `/v1/token/${tokenId}/used`
  return _postPayments(url, undefined, 'mark token as used', loggingFields, 'markTokenAsUsed')
}

module.exports = {
  findByToken,
  markTokenAsUsed
}
