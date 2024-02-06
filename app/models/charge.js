'use strict'

const logger = require('../utils/logger')(__filename)
const connectorClient = require('../services/clients/connector.client')
const paymentsClient = require('../services/clients/payments.client')
const State = require('../../config/state.js')
const StateModel = require('../../config/state')

// Constants
const CANCELABLE_STATES = [
  StateModel.CREATED,
  StateModel.ENTERING_CARD_DETAILS,
  StateModel.AUTH_SUCCESS,
  StateModel.AUTH_READY,
  StateModel.AUTH_3DS_REQUIRED,
  StateModel.AUTH_3DS_READY
]

module.exports = correlationId => {
  correlationId = correlationId || ''

  const updateToEnterDetails = function (chargeId, loggingFields = {}) {
    return updateStatus(chargeId, State.ENTERING_CARD_DETAILS, loggingFields)
  }

  const updateStatus = function (chargeId, status, loggingFields = {}) {
    return new Promise(function (resolve, reject) {
      connectorClient({ correlationId }).updateStatus({ chargeId, payload: { new_status: status } }, loggingFields)
        .then(response => {
          updateComplete(response, { resolve, reject }, loggingFields)
        })
        .catch(err => {
          clientUnavailable(err, { resolve, reject })
        })
    })
  }

  const find = function (chargeId, loggingFields = {}) {
    return new Promise(function (resolve, reject) {
      connectorClient({ correlationId }).findCharge({ chargeId }, loggingFields)
        .then(response => {
          if (response.statusCode !== 200) {
            return reject(new Error('GET_FAILED'))
          }
          resolve(response.body)
        })
        .catch(err => {
          clientUnavailable(err, { resolve, reject })
        })
    })
  }

  const capture = function (chargeId, loggingFields = {}) {
    return new Promise(function (resolve, reject) {
      connectorClient({ correlationId }).capture({ chargeId }, loggingFields)
        .then(response => {
          captureComplete(response, { resolve, reject })
        })
        .catch(err => {
          captureFail(err, { resolve, reject })
        })
    })
  }

  const cancel = function (chargeId, loggingFields = {}) {
    return new Promise(function (resolve, reject) {
      connectorClient({ correlationId }).cancel({ chargeId })
        .then(response => {
          cancelComplete(response, { resolve, reject }, loggingFields)
        })
        .catch(err => {
          cancelFail(err, { resolve, reject })
        })
    })
  }

  const findByToken = async function (tokenId, loggingFields = {}) {
    let response
    try {
      response = await paymentsClient.findByToken(tokenId, loggingFields)
    } catch (err) {
      throw new Error('CLIENT_UNAVAILABLE', err)
    }
    if (response.statusCode !== 200) {
      throw new Error('UNAUTHORISED')
    }
    return response.body
  }

  const patch = async function (chargeId, op, path, value, loggingFields = {}) {
    const payload = {
      op: op,
      path: path,
      value: value
    }
    const response = await connectorClient({ correlationId }).patch({ chargeId, payload }, loggingFields)
    if (response.statusCode !== 200) {
      throw new Error('Calling connector to patch a charge returned an unexpected status code')
    }
  }

  const cancelComplete = function (response, defer, loggingFields = {}) {
    const code = response.statusCode
    if (code === 204) return defer.resolve()
    logger.error('Calling connector cancel a charge failed', {
      ...loggingFields,
      service: 'connector',
      method: 'POST',
      status_code: code
    })
    if (code === 400) return defer.reject(new Error('CANCEL_FAILED'))
    return defer.reject(new Error('POST_FAILED'))
  }

  const cancelFail = function (err, defer) {
    clientUnavailable(err, defer)
  }

  const captureComplete = function (response, defer) {
    const code = response.statusCode
    if (code === 204) return defer.resolve()
    if (code === 400) return defer.reject(new Error('CAPTURE_FAILED'))
    return defer.reject(new Error('POST_FAILED'))
  }

  const captureFail = function (err, defer) {
    clientUnavailable(err, defer)
  }

  const updateComplete = function (response, defer, loggingFields = {}) {
    if (response.statusCode !== 204) {
      logger.error('Calling connector to update charge status failed', {
        ...loggingFields,
        status_code: response.statusCode
      })
      defer.reject(new Error('UPDATE_FAILED'))
      return
    }
    defer.resolve({ success: 'OK' })
  }

  const isCancellableCharge = chargeStatus => {
    return CANCELABLE_STATES.includes(chargeStatus)
  }

  const clientUnavailable = function (error, defer) {
    defer.reject(new Error('CLIENT_UNAVAILABLE'), error)
  }

  return {
    updateStatus,
    updateToEnterDetails,
    find,
    capture,
    findByToken,
    cancel,
    patch,
    isCancellableCharge
  }
}
