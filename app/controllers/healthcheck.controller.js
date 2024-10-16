// NPM dependencies
const _ = require('lodash')
const logger = require('../utils/logger')(__filename)
const { getLoggingFields } = require('../utils/logging-fields-helper')
const { Client } = require('@govuk-pay/pay-js-commons/lib/utils/axios-base-client/axios-base-client')
const { configureClient } = require('../services/clients/base/config')
const SERVICE_NAME = 'frontend'
const client = new Client(SERVICE_NAME)
const { CORRELATION_HEADER } = require('../../config/correlation-header')

const healthyPingResponse = { ping: { healthy: true } }

const respond = (res, statusCode, data) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

module.exports.healthcheck = async (req, res) => {
  if (process.env.FORWARD_PROXY_URL) {
    const url = `${process.env.FORWARD_PROXY_URL}/nginx_status`

    configureClient(client, url, req.headers[CORRELATION_HEADER])

    let response

    try {
      response = await client.get(url, 'Healthcheck')

      if (response.status !== 200) {
        logger.error('Healthchecking forward proxy returned error', {
          ...getLoggingFields(req),
          status_code: response.status
        })
        respond(res, 502, _.merge(healthyPingResponse, { proxy: { healthy: false } }))
      } else {
        respond(res, 200, healthyPingResponse)
      }
    } catch (err) {
      logger.error('Healthchecking forward proxy returned error', {
        ...getLoggingFields(req),
        error: err,
        status_code: response.status
      })
      respond(res, 502, _.merge(healthyPingResponse, { proxy: { healthy: false } }))
    }
  } else {
    respond(res, 200, healthyPingResponse)
  }
}
