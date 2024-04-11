'use strict'

// Local dependencies
const { Client } = require('@govuk-pay/pay-js-commons/lib/utils/axios-base-client/axios-base-client')
const { configureClient } = require('./base/config')
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
async function _getAdminUsers (url, description, findOptions, loggingFields = {}, callingFunctionName) {
  const startTime = new Date()
  const context = {
    url: url,
    startTime: startTime,
    method: 'GET',
    description: description,
    service: SERVICE_NAME
  }
  requestLogger.logRequestStart(context, loggingFields)

  const client = new Client(SERVICE_NAME)
  configureClient(client, url)

  try {
    const fullUrl = `${url}?gatewayAccountId=${findOptions.gatewayAccountId}`
    const response = await client.get(fullUrl, description)
  
    requestLogger.logRequestEnd(context, response.status, loggingFields)
    incrementStatusCodeCounter(callingFunctionName, response.status)
    if (SUCCESS_CODES.includes(response.status)) {
      return new Service(response.data)
    } else {
      if (response.status > 499 && response.status < 600) {
        logger.error(`Error communicating with ${url}`, {
          ...loggingFields,
          service: 'adminusers',
          method: 'GET',
          status_code: response.status,
          url: fullUrl
        })
      }
      return response.data
    }
  } catch(err) {
    requestLogger.logRequestError(context, err, loggingFields)
    incrementStatusCodeCounter(callingFunctionName, 'error')
    throw err
  }
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
