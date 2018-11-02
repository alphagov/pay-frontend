'use strict'

// NPM dependencies
const logger = require('winston')

// Local dependencies
const baseClient = require('../../utils/base_client')
const requestLogger = require('../../utils/request_logger')

// Constants
const SERVICE_NAME = 'connector'
const CARD_AUTH_PATH = '/v1/frontend/charges/{chargeId}/cards'
const CARD_3DS_PATH = '/v1/frontend/charges/{chargeId}/3ds'

let baseUrl
let correlationId

/** @private */
const _getAuthUrlFor = chargeId => baseUrl + CARD_AUTH_PATH.replace('{chargeId}', chargeId)

/** @private */
const _getThreeDsFor = chargeId => baseUrl + CARD_3DS_PATH.replace('{chargeId}', chargeId)

/** @private */
const _postConnector = (url, payload, description) => {
  return new Promise(function (resolve, reject) {
    const startTime = new Date()
    const context = {
      url: url,
      method: 'POST',
      description: description,
      service: SERVICE_NAME
    }
    requestLogger.logRequestStart(context)
    baseClient.post(
      url,
      {
        payload: payload,
        correlationId: correlationId
      },
      null,
      null
    ).then(response => {
      logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'POST', url, new Date() - startTime)
      resolve(response)
    }).catch(err => {
      reject(err)
    })
  })
}

const threeDs = (chargeOptions) => {
  const authUrl = _getThreeDsFor(chargeOptions.chargeId)
  return _postConnector(authUrl, chargeOptions.payload, '3ds')
}

const chargeAuth = (chargeOptions) => {
  const authUrl = _getAuthUrlFor(chargeOptions.chargeId)
  return _postConnector(authUrl, chargeOptions.payload, 'create charge')
}

module.exports = function (clientOptions = {}) {
  baseUrl = clientOptions.baseUrl || process.env.CONNECTOR_HOST
  correlationId = clientOptions.correlationId || ''
  return {
    chargeAuth: chargeAuth,
    threeDs: threeDs
  }
}
