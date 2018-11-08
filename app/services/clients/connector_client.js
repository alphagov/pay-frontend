'use strict'

// Local dependencies
const baseClient = require('./base_client/base_client')

// Constants
const SERVICE_NAME = 'connector'

const CARD_AUTH_PATH = '/v1/frontend/charges/{chargeId}/cards'
const CARD_3DS_PATH = '/v1/frontend/charges/{chargeId}/3ds'
const CARD_STATUS_PATH = '/v1/frontend/charges/{chargeId}/status'
const CARD_CAPTURE_PATH = '/v1/frontend/charges/{chargeId}/capture'
const CARD_CANCEL_PATH = '/v1/frontend/charges/{chargeId}/cancel'
const CARD_FIND_BY_TOKEN_PATH = '/v1/frontend/tokens/{chargeTokenId}/charge'
const CARD_DELETE_CHARGE_TOKEN_PATH = '/v1/frontend/tokens/{chargeTokenId}'
const CARD_CHARGE_PATH = '/v1/frontend/charges/{chargeId}'

let baseUrl
let correlationId

/** @private */
const _getFindChargeUrlFor = chargeId => CARD_CHARGE_PATH.replace('{chargeId}', chargeId)

/** @private */
const _getAuthUrlFor = chargeId => CARD_AUTH_PATH.replace('{chargeId}', chargeId)

/** @private */
const _getThreeDsUrlFor = chargeId => CARD_3DS_PATH.replace('{chargeId}', chargeId)

/** @private */
const _getUpdateStatusUrlFor = chargeId => CARD_STATUS_PATH.replace('{chargeId}', chargeId)

/** @private */
const _getCaptureUrlFor = chargeId => CARD_CAPTURE_PATH.replace('{chargeId}', chargeId)

/** @private */
const _getCancelUrlFor = chargeId => CARD_CANCEL_PATH.replace('{chargeId}', chargeId)

/** @private */
const _getFindByTokenUrlFor = tokenId => CARD_FIND_BY_TOKEN_PATH.replace('{chargeTokenId}', tokenId)

/** @private */
const _getDeleteTokenUrlFor = tokenId => CARD_DELETE_CHARGE_TOKEN_PATH.replace('{chargeTokenId}', tokenId)

/** @private */
const _getPatchUrlFor = chargeId => CARD_CHARGE_PATH.replace('{chargeId}', chargeId)

/** @private */
const _putConnector = (url, body, description, subSegment) => {
  return baseClient.put(
    {
      baseUrl,
      url,
      body,
      json: true,
      correlationId,
      description,
      service: SERVICE_NAME,
      subSegment
    }
  )
}

/** @private */
const _postConnector = (url, body, description, subSegment) => {
  return baseClient.post(
    {
      baseUrl,
      url,
      body,
      json: true,
      correlationId,
      description,
      service: SERVICE_NAME,
      subSegment
    }
  )
}

/** @private */
const _patchConnector = (url, body, description, subSegment) => {
  return baseClient.patch(
    {
      baseUrl,
      url,
      body,
      json: true,
      correlationId,
      description,
      service: SERVICE_NAME,
      subSegment
    }
  )
}

/** @private */
const _getConnector = (url, description, subSegment) => {
  return baseClient.get(
    {
      baseUrl,
      url,
      json: true,
      correlationId,
      description,
      service: SERVICE_NAME,
      subSegment
    }
  )
}

/** @private */
const _deleteConnector = (url, description, subSegment) => {
  return baseClient.delete(
    {
      baseUrl,
      url,
      json: true,
      correlationId,
      description,
      service: SERVICE_NAME,
      subSegment
    }
  )
}

// POST functions
const threeDs = chargeOptions => {
  const threeDsUrl = _getThreeDsUrlFor(chargeOptions.chargeId)
  return _postConnector(threeDsUrl, chargeOptions.body, '3ds')
}

const chargeAuth = chargeOptions => {
  const authUrl = _getAuthUrlFor(chargeOptions.chargeId)
  return _postConnector(authUrl, chargeOptions.body, 'create charge')
}

const capture = chargeOptions => {
  const captureUrl = _getCaptureUrlFor(chargeOptions.chargeId)
  return _postConnector(captureUrl, null, 'do capture')
}

const cancel = chargeOptions => {
  const cancelUrl = _getCancelUrlFor(chargeOptions.chargeId)
  return _postConnector(cancelUrl, null, 'cancel charge')
}

// PUT functions
const updateStatus = (chargeOptions, subSegment) => {
  const updateStatusUrl = _getUpdateStatusUrlFor(chargeOptions.chargeId)
  return _putConnector(updateStatusUrl, chargeOptions.body, 'update status', subSegment)
}

// PATCH functions
const patch = chargeOptions => {
  const patchUrl = _getPatchUrlFor(chargeOptions.chargeId)
  return _patchConnector(patchUrl, chargeOptions.body, 'patch')
}

// GET functions
const findCharge = chargeOptions => {
  const findChargeUrl = _getFindChargeUrlFor(chargeOptions.chargeId)
  return _getConnector(findChargeUrl, 'find charge')
}

const findByToken = chargeOptions => {
  const findByTokenUrl = _getFindByTokenUrlFor(chargeOptions.tokenId)
  return _getConnector(findByTokenUrl, 'find by token')
}

// DELETE functions
const deleteToken = chargeOptions => {
  const deleteTokenUrl = _getDeleteTokenUrlFor(chargeOptions.tokenId)
  return _deleteConnector(deleteTokenUrl, 'delete token')
}

module.exports = function (clientOptions = {}) {
  baseUrl = clientOptions.baseUrl || process.env.CONNECTOR_HOST
  correlationId = clientOptions.correlationId || ''
  return {
    chargeAuth,
    threeDs,
    updateStatus,
    findCharge,
    capture,
    cancel,
    findByToken,
    patch,
    deleteToken
  }
}
