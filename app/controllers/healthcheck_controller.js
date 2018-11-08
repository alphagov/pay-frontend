'use strict'

// NPM dependencies
const _ = require('lodash')
const logger = require('winston')

// Local dependencies
const healthcheckClient = require('../services/clients/healthcheck_client')

// Constants
const healthyPingResponse = {'ping': {'healthy': true}}

const respond = (res, statusCode, data) => {
  res.writeHead(statusCode, {'Content-Type': 'application/json'})
  res.end(JSON.stringify(data))
}

module.exports.healthcheck = (req, res) => {
  healthcheckClient.ping()
    .then(response => {
      const noProxy = typeof response === 'boolean'
      if (!noProxy && response.statusCode !== 200) {
        throw new Error('Non HTTP 200 response')
      } else {
        respond(res, 200, _.merge(healthyPingResponse, !noProxy ? {proxy: {healthy: true}} : {}))
      }
    })
    .catch(err => {
      logger.error(`Healthchecking forward proxy returned error: ${err}`)
      respond(res, 502, _.merge(healthyPingResponse, {proxy: {healthy: false}}))
    })
}
