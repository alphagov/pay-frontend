'use strict'
const baseClient = require('../../utils/base_client2')
const requestLogger = require('../../utils/request_logger')
const Service = require('../../models/Service.class')
const createCallbackToPromiseConverter = require('../../utils/response_converter').createCallbackToPromiseConverter

const responseBodyToServiceTransformer = body => new Service(body)
const SERVICE_NAME = 'adminusers'

module.exports = function (clientOptions = {}) {
  const baseUrl = clientOptions.baseUrl || process.env.ADMINUSERS_URL
  const correlationId = clientOptions.correlationId || ''
  const servicesResource = `${baseUrl}/v1/api/services`

  /**
   *
   * @param serviceExternalId
   * @returns {*|promise}
   */
  const getServiceById = (serviceExternalId) => {
    return new Promise(function (resolve, reject) {
      const params = {
        correlationId: correlationId
      }
      const url = `${servicesResource}/${serviceExternalId}`
      const startTime = new Date()
      const context = {
        url: url,
        promise: { resolve: resolve, reject: reject },
        startTime: startTime,
        correlationId: correlationId,
        method: 'GET',
        description: 'get a service',
        service: SERVICE_NAME
      }

      const callbackToPromiseConverter = createCallbackToPromiseConverter(context, responseBodyToServiceTransformer)

      requestLogger.logRequestStart(context)

      baseClient.get(url, params, callbackToPromiseConverter)
          .on('error', callbackToPromiseConverter)
    })
  }

  /**
   *
   * @param findOptions - for now only `findOptions.gatewayAccountId` property is supported
   */
  const findServiceBy = (findOptions) => {
    return new Promise(function (resolve, reject) {
      const params = {
        correlationId: correlationId,
        qs: {
          gatewayAccountId: findOptions.gatewayAccountId
        }
      }

      const url = `${servicesResource}`
      const startTime = new Date()
      const context = {
        url: url,
        promise: { resolve: resolve, reject: reject },
        startTime: startTime,
        correlationId: correlationId,
        method: 'GET',
        description: 'find a service',
        service: SERVICE_NAME
      }

      const callbackToPromiseConverter = createCallbackToPromiseConverter(context, responseBodyToServiceTransformer)

      requestLogger.logRequestStart(context)

      baseClient.get(url, params, callbackToPromiseConverter)
          .on('error', callbackToPromiseConverter)
    })
  }

  return {
    getServiceById: getServiceById,
    findServiceBy: findServiceBy
  }
}
