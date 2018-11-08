'use strict'

// local dependencies
const baseClient = require('./base_client/base_client')

// constants
const baseUrl = process.env.FORWARD_PROXY_URL
const url = '/nginx_status'
const description = 'forward proxy healthcheck'
const service = 'pay-frontend nginx'

module.exports = {
  ping: function () {
    if (process.env.FORWARD_PROXY_URL) {
      return baseClient.get(
        {
          baseUrl,
          url,
          json: true,
          correlationId: null,
          description,
          service,
          subSegment: null
        })
    }
    return Promise.resolve(true)
  }
}
