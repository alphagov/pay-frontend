var logger = require('winston')
var q = require('q')

var baseClient = require('../utils/base_client2')
var paths = require('../paths.js')
var State = require('./state.js')

module.exports = function (correlationId) {
  'use strict'

  correlationId = correlationId || ''

  var connectorurl = function (resource, params) {
    return paths.generateRoute(`connectorCharge.${resource}`, params)
  }

  var updateToEnterDetails = function (chargeId) {
    return updateStatus(chargeId, State.ENTERING_CARD_DETAILS)
  }

  var updateStatus = function (chargeId, status) {
    var url = connectorurl('updateStatus', {chargeId: chargeId})
    var data = {new_status: status}
    var defer = q.defer()

    logger.debug('[%s] Calling connector to update charge status -', correlationId, {
      service: 'connector',
      method: 'PUT',
      chargeId: chargeId,
      newStatus: status,
      url: url
    })

    var startTime = new Date()

    baseClient.put(url, { payload: data, correlationId: correlationId }, function (err, data) {
      logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'PUT', url, new Date() - startTime)
      if (err) {
        logger.error('Calling connector to update charge status threw exception -', {
          service: 'connector',
          method: 'PUT',
          chargeId: chargeId,
          url: url,
          error: err
        })
        return clientUnavailable(err, defer)
      }
      updateComplete(data.statusCode, chargeId, defer)
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

  var find = function (chargeId) {
    var defer = q.defer()
    var url = connectorurl('show', {chargeId: chargeId})

    logger.debug('[%s] Calling connector to get charge -', correlationId, {
      service: 'connector',
      method: 'GET',
      chargeId: chargeId,
      url: url
    })

    var startTime = new Date()
    baseClient.get(url, {correlationId: correlationId}, function (err, data) {
      logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'GET', url, new Date() - startTime)
      if (err) {
        logger.error('[%s] Calling connector to get charge threw exception -', correlationId, {
          service: 'connector',
          method: 'GET',
          chargeId: chargeId,
          url: url,
          error: err
        })
        return clientUnavailable(err, defer)
      }
      if (data.statusCode !== 200) {
        logger.warn('[%s] Calling connector to get charge failed -', correlationId, {
          service: 'connector',
          method: 'GET',
          chargeId: chargeId,
          url: url,
          status: data.statusCode
        })
        return defer.reject(new Error('GET_FAILED'))
      }
      defer.resolve(data.body)
    }).on('error', function (err) {
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

  var capture = function (chargeId) {
    var url = connectorurl('capture', {chargeId: chargeId})
    var defer = q.defer()

    logger.debug('[%s] Calling connector to do capture -', correlationId, {
      service: 'connector',
      method: 'POST',
      chargeId: chargeId,
      url: url
    })

    var startTime = new Date()
    baseClient.post(url, { correlationId: correlationId }, function (err, data) {
      logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'POST', url, new Date() - startTime)
      if (err) {
        logger.error('[%s] Calling connector to do capture failed -', correlationId, {
          service: 'connector',
          method: 'POST',
          chargeId: chargeId,
          url: url,
          error: err
        })
        return captureFail(err, defer)
      }
      captureComplete(data.statusCode, defer)
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

  var cancel = function (chargeId) {
    var url = connectorurl('cancel', {chargeId: chargeId})
    var defer = q.defer()

    logger.debug('[%s] Calling connector to cancel a charge -', correlationId, {
      service: 'connector',
      method: 'POST',
      chargeId: chargeId,
      url: url
    })

    var startTime = new Date()
    baseClient.post(url, { correlationId: correlationId }, function (err, data) {
      logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'POST', url, new Date() - startTime)
      if (err) {
        logger.error('[%s] Calling connector cancel a charge threw exception -', correlationId, {
          service: 'connector',
          method: 'POST',
          url: url,
          error: err
        })
        return cancelFail(err, defer)
      }
      cancelComplete(data.statusCode, defer)
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

  var cancelComplete = function (statusCode, defer) {
    if (statusCode === 204) return defer.resolve()
    logger.error('[%s] Calling connector cancel a charge failed -', correlationId, {
      service: 'connector',
      method: 'POST',
      status: statusCode
    })
    if (statusCode === 400) return defer.reject(new Error('CANCEL_FAILED'))
    return defer.reject(new Error('POST_FAILED'))
  }

  var cancelFail = function (err, defer) {
    clientUnavailable(err, defer)
  }

  var findByToken = function (tokenId) {
    var defer = q.defer()
    logger.debug('[%s] Calling connector to find a charge by token -', correlationId, {
      service: 'connector',
      method: 'GET'
    })

    var startTime = new Date()
    var findByUrl = connectorurl('findByToken', {chargeTokenId: tokenId})

    baseClient.get(findByUrl, {correlationId: correlationId}, function (err, data) {
      logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'GET', findByUrl, new Date() - startTime)
      if (err) {
        logger.error('[%s] Calling connector to find a charge by token threw exception -', correlationId, {
          service: 'connector',
          method: 'GET',
          error: err
        })
        return clientUnavailable(err, defer)
      }
      if (data.statusCode !== 200) {
        logger.warn('[%s] Calling connector to find a charge by token failed -', correlationId, {
          service: 'connector',
          method: 'GET',
          status: data.statusCode
        })
        defer.reject(new Error('GET_FAILED'))
        return
      }
      defer.resolve(data.body)
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

  var captureComplete = function (statusCode, defer) {
    if (statusCode === 204) return defer.resolve()
    if (statusCode === 400) return defer.reject(new Error('CAPTURE_FAILED'))
    return defer.reject(new Error('POST_FAILED'))
  }

  var captureFail = function (err, defer) {
    clientUnavailable(err, defer)
  }

  var updateComplete = function (statusCode, chargeId, defer) {
    if (statusCode !== 204) {
      logger.error('[%s] Calling connector to update charge status failed -', correlationId, {
        chargeId: chargeId,
        status: statusCode
      })
      defer.reject(new Error('UPDATE_FAILED'))
      return
    }

    defer.resolve({success: 'OK'})
  }

  var patch = function (chargeId, op, path, value) {
    var defer = q.defer()

    var startTime = new Date()
    var chargesUrl = process.env.CONNECTOR_HOST + '/v1/frontend/charges/'

    logger.debug('[%s] Calling connector to patch charge -', correlationId, {
      service: 'connector',
      method: 'PATCH'
    })

    var params = {
      payload: {
        op: op,
        path: path,
        value: value
      },
      correlationId: correlationId
    }

    baseClient.patch(chargesUrl + chargeId, params, function (err, data) {
      logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'PATCH', chargesUrl, new Date() - startTime)
      if (err) {
        logger.error('[%s] Calling connector to patch a charge threw exception -', correlationId, {
          service: 'connector',
          method: 'PATCH',
          error: err
        })
        return defer.reject()
      }
      var code = data.statusCode
      if (code === 200) {
        defer.resolve()
      } else {
        defer.reject()
      }
    }).on('error', function (err) {
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

  var clientUnavailable = function (error, defer) {
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
