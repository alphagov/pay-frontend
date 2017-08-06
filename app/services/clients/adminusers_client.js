'use strict'
const q = require('q')
const baseClient = require('../../utils/base_client2')
const requestLogger = require('../../utils/request_logger')
const Service = require('../../models/Service.class')
const createCallbackToPromiseConverter = require('../../utils/response_converter').createCallbackToPromiseConverter

const responseBodyToServiceTransformer = body => new Service(body)
const SERVICE_NAME = 'adminusers'

module.exports = function (clientOptions = {}) {
  const baseUrl = clientOptions.baseUrl || process.env.ADMINUSERS_URL
  const correlationId = clientOptions.correlationId || ''
  const serviceResource = `${baseUrl}/v1/api/services`

  /**
   *
   * @param serviceExternalId
   * @returns {*|promise}
   */
  const getServiceById = (serviceExternalId) => {
    const params = {
      correlationId: correlationId
    }
    const url = `${serviceResource}/${serviceExternalId}`
    const defer = q.defer()
    const startTime = new Date()
    const context = {
      url: url,
      defer: defer,
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

    return defer.promise
  }

  /**
   *
   * @param findOptions - for now only `findOptions.gatewayAccountId` property is supported
   */
  const findServiceBy = (findOptions) => {
    const params = {
      correlationId: correlationId,
      qs: {
        gatewayAccountId: findOptions.gatewayAccountId
      }
    }

    const url = `${serviceResource}`
    const defer = q.defer()
    const startTime = new Date()
    const context = {
      url: url,
      defer: defer,
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

    return defer.promise
  }

  return {
    getServiceById: getServiceById,
    findServiceBy: findServiceBy
  }
}
