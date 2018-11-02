'use strict'

// NPM dependencies
const logger = require('winston')

// Local dependencies
const baseClient = require('../../utils/base_client')
const requestLogger = require('../../utils/request_logger')

// Constants
const SERVICE_NAME = 'connector'
const CARD_AUTH_PATH = '/v1/frontend/charges/{chargeId}/cards'

let baseUrl
let correlationId

/** @private */
const _getAuthUrlFor = function (chargeId) {
  return baseUrl + CARD_AUTH_PATH.replace('{chargeId}', chargeId)
}

const chargeAuth = (chargeOptions) => {
  return new Promise(function (resolve, reject) {
    const authUrl = _getAuthUrlFor(chargeOptions.chargeId)
    const startTime = new Date()
    const context = {
      url: authUrl,
      method: 'POST',
      description: 'create charge',
      service: SERVICE_NAME
    }
    requestLogger.logRequestStart(context)
    baseClient.post(
      authUrl,
      {
        payload: chargeOptions.payload,
        correlationId: correlationId
      },
      null,
      null
    ).then(response => {
      logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'POST', authUrl, new Date() - startTime)
      resolve(response)
    }).catch(err => {
      reject(err)
    })
  })
}

module.exports = function (clientOptions = {}) {
  baseUrl = clientOptions.baseUrl || process.env.CONNECTOR_HOST
  correlationId = clientOptions.correlationId || ''
  return {
    chargeAuth: chargeAuth
  }
}
