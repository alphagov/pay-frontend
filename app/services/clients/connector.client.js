'use strict'

const logger = require('../../utils/logger')(__filename)
const baseClient = require('./base.client/base.client')
const requestLogger = require('../../utils/request-logger')
const { getCounter } = require('../../metrics/graphite-reporter')

const METRICS_PREFIX = 'internal-rest-call.connector'
const SERVICE_NAME = 'connector'
const WALLET_AUTH_PATH = '/v1/frontend/charges/{chargeId}/wallets/{provider}'
const CARD_AUTH_PATH = '/v1/frontend/charges/{chargeId}/cards'
const CARD_3DS_PATH = '/v1/frontend/charges/{chargeId}/3ds'
const CARD_STATUS_PATH = '/v1/frontend/charges/{chargeId}/status'
const CARD_CAPTURE_PATH = '/v1/frontend/charges/{chargeId}/capture'
const CARD_CANCEL_PATH = '/v1/frontend/charges/{chargeId}/cancel'
const CARD_FIND_BY_TOKEN_PATH = '/v1/frontend/tokens/{chargeTokenId}'
const TOKEN_USED_PATH = '/v1/frontend/tokens/{chargeTokenId}/used'
const CARD_CHARGE_PATH = '/v1/frontend/charges/{chargeId}'
const WORLDPAY_3DS_FLEX_JWT_PATH = '/v1/frontend/charges/{chargeId}/worldpay/3ds-flex/ddc'

let baseUrl
let correlationId

/** @private */
const _getFindChargeUrlFor = chargeId => baseUrl + CARD_CHARGE_PATH.replace('{chargeId}', chargeId)

/** @private */
const _getAuthUrlFor = chargeId => baseUrl + CARD_AUTH_PATH.replace('{chargeId}', chargeId)

/** @private */
const _getWalletAuthUrlFor = (chargeId, provider) => baseUrl + WALLET_AUTH_PATH.replace('{chargeId}', chargeId).replace('{provider}', provider)

/** @private */
const _getThreeDsFor = chargeId => baseUrl + CARD_3DS_PATH.replace('{chargeId}', chargeId)

/** @private */
const _getUpdateStatusUrlFor = chargeId => baseUrl + CARD_STATUS_PATH.replace('{chargeId}', chargeId)

/** @private */
const _getCaptureUrlFor = chargeId => baseUrl + CARD_CAPTURE_PATH.replace('{chargeId}', chargeId)

/** @private */
const _getCancelUrlFor = chargeId => baseUrl + CARD_CANCEL_PATH.replace('{chargeId}', chargeId)

/** @private */
const _getFindByTokenUrlFor = tokenId => baseUrl + CARD_FIND_BY_TOKEN_PATH.replace('{chargeTokenId}', tokenId)

/** @private */
const _markUsedTokenUrl = tokenId => baseUrl + TOKEN_USED_PATH.replace('{chargeTokenId}', tokenId)

/** @private */
const _getPatchUrlFor = chargeId => baseUrl + CARD_CHARGE_PATH.replace('{chargeId}', chargeId)

/** @private */
const _getWorldpay3dsFlexUrlFor = chargeId => baseUrl + WORLDPAY_3DS_FLEX_JWT_PATH.replace('{chargeId}', chargeId)

/** @private */
function _putConnector (url, payload, description, loggingFields = {}, callingFunctionName) {
  const startTime = new Date()
  const context = {
    ...loggingFields,
    url: url,
    method: 'PUT',
    description: description,
    service: SERVICE_NAME
  }
  requestLogger.logRequestStart(context, loggingFields)
  return baseClient
    .put(url, { payload, correlationId })
    .then(response => {
      logger.info('PUT to %s ended - total time %dms', url, new Date() - startTime, loggingFields)
      incrementStatusCodeCounter(callingFunctionName, response.statusCode)
      if (response.statusCode > 499 && response.statusCode < 600) {
        logger.error(`Error communicating with ${url}`, {
          ...loggingFields,
          service: 'connector',
          method: 'PUT',
          status_code: response.statusCode,
          url: url
        })
      }
      return response
    }).catch(err => {
      logger.info('PUT to %s ended - total time %dms', url, new Date() - startTime, loggingFields)
      logger.error('Calling connector threw exception', {
        ...loggingFields,
        service: 'connector',
        method: 'PUT',
        url: url,
        error: err
      })
      incrementStatusCodeCounter(callingFunctionName, 'error')
      throw err
    })
}

/** @private */
function _postConnector (url, payload, description, loggingFields = {}, callingFunctionName) {
  const startTime = new Date()
  const context = {
    url: url,
    method: 'POST',
    description: description,
    service: SERVICE_NAME
  }
  requestLogger.logRequestStart(context, loggingFields)
  return baseClient.post(
    url,
    { payload, correlationId }
  ).then(response => {
    logger.info('POST to %s ended - total time %dms', url, new Date() - startTime, loggingFields)
    incrementStatusCodeCounter(callingFunctionName, response.statusCode)
    if (response.statusCode > 499 && response.statusCode < 600) {
      logger.error(`Error communicating with ${url}`, {
        ...loggingFields,
        service: 'connector',
        method: 'POST',
        status_code: response.statusCode,
        url: url
      })
    }
    return response
  }).catch(err => {
    logger.info('POST to %s ended - total time %dms', url, new Date() - startTime, loggingFields)
    logger.error('Calling connector threw exception', {
      ...loggingFields,
      service: 'connector',
      method: 'POST',
      url: url,
      error: err
    })
    incrementStatusCodeCounter(callingFunctionName, 'error')
    throw err
  })
}

/** @private */
function _patchConnector (url, payload, description, loggingFields = {}, callingFunctionName) {
  const startTime = new Date()
  const context = {
    url: url,
    method: 'PATCH',
    description: description,
    service: SERVICE_NAME
  }
  requestLogger.logRequestStart(context, loggingFields)
  return baseClient.patch(
    url,
    { payload, correlationId }
  ).then(response => {
    logger.info('PATCH to %s ended - total time %dms', url, new Date() - startTime, loggingFields)
    incrementStatusCodeCounter(callingFunctionName, response.statusCode)
    if (response.statusCode > 499 && response.statusCode < 600) {
      logger.error(`Error communicating with ${url}`, {
        ...loggingFields,
        service: 'connector',
        method: 'PATCH',
        status_code: response.statusCode,
        url: url
      })
    }
    return response
  }).catch(err => {
    logger.info('PATCH %s to %s ended - total time %dms', url, new Date() - startTime, loggingFields)
    logger.error('Calling connector threw exception', {
      ...loggingFields,
      service: 'connector',
      method: 'PATCH',
      url: url,
      error: err
    })
    incrementStatusCodeCounter(callingFunctionName, 'error')
    throw err
  })
}

/** @private */
function _getConnector (url, description, loggingFields = {}, callingFunctionName) {
  const startTime = new Date()
  const context = {
    url: url,
    method: 'GET',
    description: description,
    service: SERVICE_NAME
  }
  requestLogger.logRequestStart(context, loggingFields)
  return baseClient.get(url, { correlationId })
    .then(response => {
      logger.info('GET to %s ended - total time %dms', url, new Date() - startTime, loggingFields)
      incrementStatusCodeCounter(callingFunctionName, response.statusCode)
      if (response.statusCode !== 200) {
        logger.error(`Error communicating with ${url}`, {
          ...loggingFields,
          service: 'connector',
          method: 'GET',
          status_code: response.statusCode,
          url: url
        })
      }
      return response
    }).catch(err => {
      logger.info('GET to %s ended - total time %dms', url, new Date() - startTime, loggingFields)
      logger.error('Calling connector threw exception', {
        ...loggingFields,
        service: 'connector',
        method: 'GET',
        url: url,
        error: err
      })
      incrementStatusCodeCounter(callingFunctionName, 'error')
      throw err
    })
}

const incrementStatusCodeCounter = (callingFunctionName, statusCode) => {
  getCounter(`${METRICS_PREFIX}.${callingFunctionName}.${statusCode}`).inc()
}

// POST functions
const threeDs = (chargeOptions, loggingFields = {}) => {
  const threeDsUrl = _getThreeDsFor(chargeOptions.chargeId)
  return _postConnector(threeDsUrl, chargeOptions.payload, '3ds', loggingFields, 'threeDs')
}

const chargeAuth = (chargeOptions, loggingFields = {}) => {
  const authUrl = _getAuthUrlFor(chargeOptions.chargeId)
  return _postConnector(authUrl, chargeOptions.payload, 'create charge', loggingFields, 'chargeAuth')
}

const chargeAuthWithWallet = (chargeOptions, loggingFields = {}) => {
  const authUrl = _getWalletAuthUrlFor(chargeOptions.chargeId, chargeOptions.provider)
  return _postConnector(authUrl, chargeOptions.payload, 'create charge using e-wallet payment', loggingFields, 'chargeAuthWithWallet')
}

const capture = (chargeOptions, loggingFields = {}) => {
  const captureUrl = _getCaptureUrlFor(chargeOptions.chargeId)
  return _postConnector(captureUrl, null, 'do capture', loggingFields, 'capture')
}

const cancel = (chargeOptions, loggingFields = {}) => {
  const cancelUrl = _getCancelUrlFor(chargeOptions.chargeId)
  return _postConnector(cancelUrl, null, 'cancel charge', loggingFields, 'cancel')
}

// PUT functions
const updateStatus = (chargeOptions, loggingFields = {}) => {
  const updateStatusUrl = _getUpdateStatusUrlFor(chargeOptions.chargeId)
  return _putConnector(updateStatusUrl, chargeOptions.payload, 'update status', loggingFields, 'updateStatus')
}

// PATCH functions
const patch = (chargeOptions, loggingFields = {}) => {
  const patchUrl = _getPatchUrlFor(chargeOptions.chargeId)
  return _patchConnector(patchUrl, chargeOptions.payload, 'patch', loggingFields, 'patch')
}

// GET functions
const findCharge = (chargeOptions, loggingFields = {}) => {
  const findChargeUrl = _getFindChargeUrlFor(chargeOptions.chargeId)
  return _getConnector(findChargeUrl, 'find charge', loggingFields, 'findCharge')
}

const findByToken = (chargeOptions, loggingFields = {}) => {
  const findByTokenUrl = _getFindByTokenUrlFor(chargeOptions.tokenId)
  return _getConnector(findByTokenUrl, 'find by token', loggingFields, 'findByToken')
}

const getWorldpay3dsFlexJwt = (chargeOptions, loggingFields = {}) => {
  const getWorldpay3dsFlexJwtUrl = _getWorldpay3dsFlexUrlFor(chargeOptions.chargeId)
  return _getConnector(getWorldpay3dsFlexJwtUrl, 'get Worldpay 3DS Flex DDC JWT', loggingFields, 'getWorldpay3dsFlexJwt')
}

const markTokenAsUsed = (chargeOptions, loggingFields = {}) => {
  const markUsedTokenUrl = _markUsedTokenUrl(chargeOptions.tokenId)
  return _postConnector(markUsedTokenUrl, undefined, 'mark token as used', loggingFields, 'markTokenAsUsed')
}

module.exports = function (clientOptions = {}) {
  baseUrl = clientOptions.baseUrl || process.env.CONNECTOR_HOST
  correlationId = clientOptions.correlationId || ''
  return {
    chargeAuth,
    chargeAuthWithWallet,
    threeDs,
    updateStatus,
    findCharge,
    capture,
    cancel,
    findByToken,
    patch,
    markTokenAsUsed,
    getWorldpay3dsFlexJwt
  }
}
