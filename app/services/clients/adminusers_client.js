'use strict'

// Local dependencies
const baseClient = require('./base_client/base_clientOLD')
const requestLogger = require('../../utils/request_logger')
const Service = require('../../models/Service.class')
const createCallbackToPromiseConverter = require('../../utils/response_converter').createCallbackToPromiseConverter

// Constants
const SERVICE_NAME = 'adminusers'

const responseBodyToServiceTransformer = body => new Service(body)

let baseUrl
let correlationId

const findServiceBy = (findOptions) => {
  return new Promise(function (resolve, reject) {
    const servicesResource = `${baseUrl}/v1/api/services`
    const params = {
      correlationId: correlationId,
      qs: {
        gatewayAccountId: findOptions.gatewayAccountId
      }
    }
    const startTime = new Date()
    const context = {
      url: servicesResource,
      defer: {resolve, reject},
      startTime: startTime,
      correlationId: correlationId,
      method: 'GET',
      description: 'find a service',
      service: SERVICE_NAME
    }
    const callbackToPromiseConverter = createCallbackToPromiseConverter(context, responseBodyToServiceTransformer)
    requestLogger.logRequestStart(context)
    baseClient.get(servicesResource, params, callbackToPromiseConverter)
      .on('error', callbackToPromiseConverter)
  })
}

module.exports = function (clientOptions = {}) {
  baseUrl = clientOptions.baseUrl || process.env.ADMINUSERS_URL
  correlationId = clientOptions.correlationId || ''
  return {
    findServiceBy: findServiceBy
  }
}
