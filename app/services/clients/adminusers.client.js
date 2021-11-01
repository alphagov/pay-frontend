'use strict'

// Local dependencies
const baseClient = require('./base.client/base.client')
const logger = require('../../utils/logger')(__filename)
const requestLogger = require('../../utils/request-logger')
const Service = require('../../models/Service.class')
const { getCounter } = require('../../metrics/graphite-reporter')

// Constants
const SERVICE_NAME = 'adminusers'
const METRICS_PREFIX = 'internal-rest-call.adminusers'
const SUCCESS_CODES = [200, 201, 202, 204, 206]

let baseUrl
let correlationId

/** @private */
function _getAdminUsers (url, description, findOptions, loggingFields = {}, callingFunctionName) {
  const startTime = new Date()
  const context = {
    url: url,
    startTime: startTime,
    method: 'GET',
    description: description,
    service: SERVICE_NAME
  }
  requestLogger.logRequestStart(context, loggingFields)
  const params = {
    correlationId: correlationId,
    qs: {
      gatewayAccountId: findOptions.gatewayAccountId
    }
  }
  return baseClient
    .get(url, params, null)
    .then(response => {
      requestLogger.logRequestEnd(context, response.statusCode, loggingFields)
      incrementStatusCodeCounter(callingFunctionName, response.statusCode)
      if (SUCCESS_CODES.includes(response.statusCode)) {
        return new Service(response.body)
      } else {
        if (response.statusCode > 500 && response.statusCode < 600) {
          logger.error(`Error communicating with ${url}`, {
            ...loggingFields,
            service: 'adminusers',
            method: 'GET',
            status_code: response.statusCode,
            url: url
          })
        }
        return response.body
      }
    }).catch(err => {
      requestLogger.logRequestError(context, err, loggingFields)
      incrementStatusCodeCounter(callingFunctionName, 'error')
      throw err
    })
}

const incrementStatusCodeCounter = (callingFunctionName, statusCode) => {
  getCounter(`${METRICS_PREFIX}.${callingFunctionName}.${statusCode}`).inc()
}

const findServiceBy = function findServiceBy (findOptions, loggingFields = {}) {
  const servicesUrl = `${baseUrl}/v1/api/services`
  return _getAdminUsers(servicesUrl, 'find service', findOptions, loggingFields, 'findServiceBy')
}

module.exports = function (clientOptions = {}) {
  baseUrl = clientOptions.baseUrl || process.env.ADMINUSERS_URL
  correlationId = clientOptions.correlationId || ''
  return {
    findServiceBy: findServiceBy
  }
}
