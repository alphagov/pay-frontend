'use strict'

// npm dependencies
const logger = require('winston')
const q = require('q')

// local dependencies
const baseClient = require('../utils/base_client')
const paths = require('../paths.js')
const State = require('./state.js')

module.exports = function (correlationId) {
  correlationId = correlationId || ''

  const connectorurl = function (resource, params) {
    return paths.generateRoute(`connectorCharge.${resource}`, params)
  }

  const updateToEnterDetails = function (chargeId) {
    return updateStatus(chargeId, State.ENTERING_CARD_DETAILS)
  }

  const updateStatus = function (chargeId, status) {
    const url = connectorurl('updateStatus', {chargeId: chargeId})
    const data = {new_status: status}
    const defer = q.defer()

    logger.debug('[%s] Calling connector to update charge status -', correlationId, {
      service: 'connector',
      method: 'PUT',
      chargeId: chargeId,
      newStatus: status,
      url: url
    })

    const startTime = new Date()

    baseClient.put(url, { data: data, correlationId: correlationId }, function (data, response) {
      logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'PUT', url, new Date() - startTime)
      updateComplete(chargeId, data, response, defer)
    }).on('error', function (err) {
      logger.info('[] - %s to %s ended - total time %dms', 'PUT', url, new Date() - startTime)
      logger.error('Calling connector to update charge status threw exception -', {
        service: 'connector',
        method: 'PUT',
        chargeId: chargeId,
        url: url,
        error: err
      })
      clientUnavailable(err, defer)
    })

    return defer.promise
  }

  const find = function (chargeId, subSegment) {
    const defer = q.defer()
    const url = connectorurl('show', {chargeId: chargeId})

    logger.debug('[%s] Calling connector to get charge -', correlationId, {
      service: 'connector',
      method: 'GET',
      chargeId: chargeId,
      url: url
    })

    const startTime = new Date()
    baseClient.get(url, {correlationId: correlationId}, function (data, response) {
      if (response.statusCode !== 200) {
        logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'GET', url, new Date() - startTime)
        logger.warn('[%s] Calling connector to get charge failed -', correlationId, {
          service: 'connector',
          method: 'GET',
          chargeId: chargeId,
          url: url,
          status: response.statusCode
        })
        return defer.reject(new Error('GET_FAILED'))
      }
      defer.resolve(data)
    }, subSegment).on('error', function (err) {
      logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'GET', url, new Date() - startTime)
      logger.error('[%s] Calling connector to get charge threw exception -', correlationId, {
        service: 'connector',
        method: 'GET',
        chargeId: chargeId,
        url: url,
        error: err
      })
      clientUnavailable(err, defer)
    })
    return defer.promise
  }

  const capture = function (chargeId) {
    const url = connectorurl('capture', {chargeId: chargeId})
    const defer = q.defer()

    logger.debug('[%s] Calling connector to do capture -', correlationId, {
      service: 'connector',
      method: 'POST',
      chargeId: chargeId,
      url: url
    })

    const startTime = new Date()
    baseClient.post(url, { correlationId: correlationId }, function (data, response) {
      logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'POST', url, new Date() - startTime)
      captureComplete(data, response, defer)
    })
      .on('error', function (err) {
        logger.info('[%s] - %s to %s ended - total time %dms', 'POST', correlationId, url, new Date() - startTime)
        logger.error('[%s] Calling connector to do capture failed -', correlationId, {
          service: 'connector',
          method: 'POST',
          chargeId: chargeId,
          url: url,
          error: err
        })
        captureFail(err, defer)
      })

    return defer.promise
  }

  const cancel = function (chargeId) {
    const url = connectorurl('cancel', {chargeId: chargeId})
    const defer = q.defer()

    logger.debug('[%s] Calling connector to cancel a charge -', correlationId, {
      service: 'connector',
      method: 'POST',
      chargeId: chargeId,
      url: url
    })

    const startTime = new Date()
    baseClient.post(url, { correlationId: correlationId }, function (data, response) {
      logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'POST', url, new Date() - startTime)
      cancelComplete(data, response, defer)
    })
      .on('error', function (err) {
        logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'POST', url, new Date() - startTime)
        logger.error('[%s] Calling connector cancel a charge threw exception -', correlationId, {
          service: 'connector',
          method: 'POST',
          url: url,
          error: err
        })
        cancelFail(err, defer)
      })

    return defer.promise
  }

  const cancelComplete = function (data, response, defer) {
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

  const cancelFail = function (err, defer) {
    clientUnavailable(err, defer)
  }

  const findByToken = function (tokenId) {
    const defer = q.defer()
    logger.debug('[%s] Calling connector to find a charge by token -', correlationId, {
      service: 'connector',
      method: 'GET'
    })

    const startTime = new Date()
    const findByUrl = connectorurl('findByToken', {chargeTokenId: tokenId})

    baseClient.get(findByUrl, {correlationId: correlationId}, function (data, response) {
      logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'GET', findByUrl, new Date() - startTime)
      if (response.statusCode !== 200) {
        logger.warn('[%s] Calling connector to find a charge by token failed -', correlationId, {
          service: 'connector',
          method: 'GET',
          status: response.statusCode
        })
        defer.reject(new Error('GET_FAILED'))
        return
      }

      defer.resolve(data)
    }).on('error', function (err) {
      logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'GET', findByUrl, new Date() - startTime)
      logger.error('[%s] Calling connector to find a charge by token threw exception -', correlationId, {
        service: 'connector',
        method: 'GET',
        error: err
      })
      clientUnavailable(err, defer)
    })
    return defer.promise
  }

  const captureComplete = function (data, response, defer) {
    const code = response.statusCode
    if (code === 204) return defer.resolve()
    if (code === 400) return defer.reject(new Error('CAPTURE_FAILED'))
    return defer.reject(new Error('POST_FAILED'))
  }

  const captureFail = function (err, defer) {
    clientUnavailable(err, defer)
  }

  const updateComplete = function (chargeId, data, response, defer) {
    if (response.statusCode !== 204) {
      logger.error('[%s] Calling connector to update charge status failed -', correlationId, {
        chargeId: chargeId,
        status: response.statusCode
      })
      defer.reject(new Error('UPDATE_FAILED'))
      return
    }

    defer.resolve({success: 'OK'})
  }

  const patch = function (chargeId, op, path, value, subSegment) {
    const defer = q.defer()

    const startTime = new Date()
    const chargesUrl = process.env.FORWARD_PROXY_URL || process.env.CONNECTOR_HOST + '/v1/frontend/charges/'

    logger.debug('[%s] Calling connector to patch charge -', correlationId, {
      service: 'connector',
      method: 'PATCH'
    })

    const params = {
      data: {
        op: op,
        path: path,
        value: value
      },
      correlationId: correlationId
    }

    baseClient.patch(chargesUrl + chargeId, params, function (data, response) {
      logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'PATCH', chargesUrl, new Date() - startTime)
      const code = response.statusCode
      if (code === 200) {
        defer.resolve()
      } else {
        defer.reject()
      }
    }, subSegment).on('error', function (err) {
      logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'PATCH', chargesUrl, new Date() - startTime)
      logger.error('[%s] Calling connector to patch a charge threw exception -', correlationId, {
        service: 'connector',
        method: 'PATCH',
        error: err
      })
      defer.reject()
    })

    return defer.promise
  }

  const clientUnavailable = function (error, defer) {
    defer.reject(new Error('CLIENT_UNAVAILABLE'), error)
  }

  return {
    updateStatus: updateStatus,
    updateToEnterDetails: updateToEnterDetails,
    find: find,
    capture: capture,
    findByToken: findByToken,
    cancel: cancel,
    patch: patch
  }
}
