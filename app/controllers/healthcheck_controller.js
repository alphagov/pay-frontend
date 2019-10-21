// NPM dependencies
const _ = require('lodash')
const logger = require('../utils/logger')(__filename)
const baseClient = require('../services/clients/base_client/base_client')

const healthyPingResponse = { 'ping': { 'healthy': true } }

const respond = (res, statusCode, data) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

module.exports.healthcheck = (req, res) => {
  if (process.env.FORWARD_PROXY_URL) {
    baseClient.get(`${process.env.FORWARD_PROXY_URL}/nginx_status`, {}, (err, response) => {
      const statusCode = _.get(response, 'statusCode')
      if (err || statusCode !== 200) {
        logger.error(`Healthchecking forward proxy returned error: ${err}, status code: ${statusCode}`)
        respond(res, 502, _.merge(healthyPingResponse, { proxy: { healthy: false } }))
      } else {
        respond(res, 200, _.merge(healthyPingResponse, { proxy: { healthy: true } }))
      }
    })
  } else {
    respond(res, 200, healthyPingResponse)
  }
}
