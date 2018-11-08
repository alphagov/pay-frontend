'use strict'

// Local dependencies
const baseClient = require('./base_client/base_client')
const Service = require('../../models/Service.class')
const {baseClientResponseHandler} = require('../../utils/response_converter')

// Constants
const service = 'adminusers'
const url = '/v1/api/services'

let baseUrl
let correlationId

const responseBodyToServiceTransformer = body => new Service(body)

const findServiceBy = findOptions => {
  return new Promise(function (resolve, reject) {
    const responseHandler = baseClientResponseHandler({resolve, reject}, responseBodyToServiceTransformer)
    baseClient.get({
      baseUrl,
      url,
      correlationId,
      qs: {
        gatewayAccountId: findOptions.gatewayAccountId
      },
      json: true,
      description: 'find a service',
      service,
      subSegment: null
    }).then(responseHandler).catch(responseHandler)
  })
}

module.exports = function (clientOptions = {}) {
  baseUrl = clientOptions.baseUrl || process.env.ADMINUSERS_URL
  correlationId = clientOptions.correlationId || ''
  return {
    findServiceBy: findServiceBy
  }
}
