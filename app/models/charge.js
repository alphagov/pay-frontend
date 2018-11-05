'use strict'

// npm dependencies
const logger = require('winston')

// local dependencies
const baseClient = require('../utils/base_client')
const paths = require('../paths')
const State = require('./state')
const StateModel = require('../models/state')

// constants
const CANCELABLE_STATES = [
  StateModel.CREATED,
  StateModel.ENTERING_CARD_DETAILS,
  StateModel.AUTH_SUCCESS,
  StateModel.AUTH_READY,
  StateModel.CAPTURE_READY,
  StateModel.AUTH_3DS_REQUIRED,
  StateModel.AUTH_3DS_READY
]

module.exports = correlationId => {
  correlationId = correlationId || ''

  const connectorurl = (resource, params) => {
    return paths.generateRoute(`connectorCharge.${resource}`, params)
  }

  const updateToEnterDetails = (chargeId) => {
    return updateStatus(chargeId, State.ENTERING_CARD_DETAILS)
  }

  const updateStatus = (chargeId, status) => {
    return new Promise((resolve, reject) => {
      const url = connectorurl('updateStatus', {chargeId: chargeId})
      const data = {new_status: status}

      logger.debug('[%s] Calling connector to update charge status -', correlationId, {
        service: 'connector',
        method: 'PUT',
        chargeId: chargeId,
        newStatus: status,
        url: url
      })

      const startTime = new Date()

      baseClient.put(url, {payload: data, correlationId: correlationId}, null, null)
        .then(response => {
          logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'PUT', url, new Date() - startTime)
          updateComplete(response, {resolve, reject})
        })
        .catch(err => {
          logger.info('[] - %s to %s ended - total time %dms', 'PUT', url, new Date() - startTime)
          logger.error('Calling connector to update charge status threw exception -', {
            service: 'connector',
            method: 'PUT',
            chargeId: chargeId,
            url: url,
            error: err
          })
          clientUnavailable(err, {resolve, reject})
        })
    })
  }

  const find = (chargeId, subSegment) => {
    return new Promise((resolve, reject) => {
      const url = connectorurl('show', {chargeId: chargeId})

      logger.debug('[%s] Calling connector to get charge -', correlationId, {
        service: 'connector',
        method: 'GET',
        chargeId: chargeId,
        url: url
      })

      const startTime = new Date()
      baseClient.get(url, {correlationId: correlationId}, null, subSegment)
        .then(response => {
          if (response.statusCode !== 200) {
            logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'GET', url, new Date() - startTime)
            logger.warn('[%s] Calling connector to get charge failed -', correlationId, {
              service: 'connector',
              method: 'GET',
              chargeId: chargeId,
              url: url,
              status: response.statusCode
            })
            return reject(new Error('GET_FAILED'))
          }
          resolve(response.body)
        })
        .catch(err => {
          logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'GET', url, new Date() - startTime)
          logger.error('[%s] Calling connector to get charge threw exception -', correlationId, {
            service: 'connector',
            method: 'GET',
            chargeId: chargeId,
            url: url,
            error: err
          })
          clientUnavailable(err, {resolve, reject})
        })
    })
  }

  const capture = chargeId => {
    return new Promise((resolve, reject) => {
      const url = connectorurl('capture', {chargeId: chargeId})

      logger.debug('[%s] Calling connector to do capture -', correlationId, {
        service: 'connector',
        method: 'POST',
        chargeId: chargeId,
        url: url
      })

      const startTime = new Date()
      baseClient.post(url, {correlationId: correlationId}, null, null)
        .then(response => {
          logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'POST', url, new Date() - startTime)
          captureComplete(response, {resolve, reject})
        })
        .catch(err => {
          logger.info('[%s] - %s to %s ended - total time %dms', 'POST', correlationId, url, new Date() - startTime)
          logger.error('[%s] Calling connector to do capture failed -', correlationId, {
            service: 'connector',
            method: 'POST',
            chargeId: chargeId,
            url: url,
            error: err
          })
          captureFail(err, {resolve, reject})
        })
    })
  }

  const cancel = chargeId => {
    return new Promise((resolve, reject) => {
      const url = connectorurl('cancel', {chargeId: chargeId})

      logger.debug('[%s] Calling connector to cancel a charge -', correlationId, {
        service: 'connector',
        method: 'POST',
        chargeId: chargeId,
        url: url
      })

      const startTime = new Date()
      baseClient.post(url, {correlationId: correlationId}, null, null)
        .then(response => {
          logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'POST', url, new Date() - startTime)
          cancelComplete(response, {resolve, reject})
        })
        .catch(err => {
          logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'POST', url, new Date() - startTime)
          logger.error('[%s] Calling connector cancel a charge threw exception -', correlationId, {
            service: 'connector',
            method: 'POST',
            url: url,
            error: err
          })
          cancelFail(err, {resolve, reject})
        })
    })
  }

  const cancelComplete = (response, defer) => {
    const code = response.statusCode
    if (code === 204) return defer.resolve()
    logger.error('[%s] Calling connector cancel a charge failed -', correlationId, {
      service: 'connector',
      method: 'POST',
      status: code
    })
    if (code === 400) return defer.reject(new Error('CANCEL_FAILED'))
    return defer.reject(new Error('POST_FAILED'))
  }

  const cancelFail = (err, defer) => {
    clientUnavailable(err, defer)
  }

  const findByToken = tokenId => {
    return new Promise((resolve, reject) => {
      logger.debug('[%s] Calling connector to find a charge by token -', correlationId, {
        service: 'connector',
        method: 'GET'
      })

      const startTime = new Date()
      const findByUrl = connectorurl('findByToken', {chargeTokenId: tokenId})

      baseClient.get(findByUrl, {correlationId: correlationId}, null, null)
        .then(response => {
          logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'GET', findByUrl, new Date() - startTime)
          if (response.statusCode !== 200) {
            logger.warn('[%s] Calling connector to find a charge by token failed -', correlationId, {
              service: 'connector',
              method: 'GET',
              status: response.statusCode
            })
            return reject(new Error('GET_FAILED'))
          }
          resolve(response.body)
        })
        .catch(err => {
          logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'GET', findByUrl, new Date() - startTime)
          logger.error('[%s] Calling connector to find a charge by token threw exception -', correlationId, {
            service: 'connector',
            method: 'GET',
            error: err
          })
          clientUnavailable(err, {resolve, reject})
        })
    })
  }

  const captureComplete = (response, defer) => {
    const code = response.statusCode
    if (code === 204) return defer.resolve()
    if (code === 400) return defer.reject(new Error('CAPTURE_FAILED'))
    return defer.reject(new Error('POST_FAILED'))
  }

  const captureFail = (err, defer) => {
    clientUnavailable(err, defer)
  }

  const updateComplete = (response, defer) => {
    if (response.statusCode !== 204) {
      logger.error('[%s] Calling connector to update charge status failed -', correlationId, {
        chargeId: response.body,
        status: response.statusCode
      })
      defer.reject(new Error('UPDATE_FAILED'))
      return
    }

    defer.resolve({success: 'OK'})
  }

  const patch = (chargeId, op, path, value, subSegment) => {
    return new Promise((resolve, reject) => {
      const startTime = new Date()
      const chargesUrl = process.env.CONNECTOR_HOST + '/v1/frontend/charges/'

      logger.debug('[%s] Calling connector to patch charge -', correlationId, {
        service: 'connector',
        method: 'PATCH'
      })

      const params = {
        payload: {
          op: op,
          path: path,
          value: value
        },
        correlationId: correlationId
      }

      baseClient.patch(chargesUrl + chargeId, params, null, null)
        .then(response => {
          logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'PATCH', chargesUrl, new Date() - startTime)
          const code = response.statusCode
          if (code === 200) {
            resolve()
          } else {
            reject(new Error('Calling connector to patch a charge returned an unexpected status code'))
          }
        }, subSegment)
        .catch(err => {
          logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'PATCH', chargesUrl, new Date() - startTime)
          logger.error('[%s] Calling connector to patch a charge threw exception -', correlationId, {
            service: 'connector',
            method: 'PATCH',
            error: err
          })
          reject(err)
        })
    })
  }

  const isCancellableCharge = chargeStatus => {
    return CANCELABLE_STATES.includes(chargeStatus)
  }

  const clientUnavailable = (error, defer) => {
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
