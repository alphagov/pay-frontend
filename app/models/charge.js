var logger = require('pino')

var baseClient = require('../utils/base_client')
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

    return new Promise(function(resolve, reject){

      var url = connectorurl('updateStatus', {chargeId: chargeId})
      var data = {new_status: status}

      logger.debug('[%s] Calling connector to update charge status -', correlationId, {
        service: 'connector',
        method: 'PUT',
        chargeId: chargeId,
        newStatus: status,
        url: url
      })

      var startTime = new Date()

      baseClient.put(url, { data: data, correlationId: correlationId }, function (data, response) {
        logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'PUT', url, new Date() - startTime)
        updateComplete(chargeId, data, response, { resolve : resolve, reject : reject })
      }).on('error', function (err) {
        logger.info('[] - %s to %s ended - total time %dms', 'PUT', url, new Date() - startTime)
        logger.error('Calling connector to update charge status threw exception -', {
          service: 'connector',
          method: 'PUT',
          chargeId: chargeId,
          url: url,
          error: err
        })
        clientUnavailable(err, { resolve : resolve, reject : reject })
      })

    })
  }

  var find = function (chargeId) {

    return new Promise(function(resolve, reject){

      var url = connectorurl('show', {chargeId: chargeId})

      logger.debug('[%s] Calling connector to get charge -', correlationId, {
        service: 'connector',
        method: 'GET',
        chargeId: chargeId,
        url: url
      })

      var startTime = new Date()
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
          return reject(new Error('GET_FAILED'))
        }
        resolve(data)
      }).on('error', function (err) {
        logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'GET', url, new Date() - startTime)
        logger.error('[%s] Calling connector to get charge threw exception -', correlationId, {
          service: 'connector',
          method: 'GET',
          chargeId: chargeId,
          url: url,
          error: err
        })
        clientUnavailable(err, { resolve : resolve, reject : reject })
      })

    })

  }

  var capture = function (chargeId) {

    return new Promise(function(resolve, reject){

      var url = connectorurl('capture', {chargeId: chargeId})

      logger.debug('[%s] Calling connector to do capture -', correlationId, {
        service: 'connector',
        method: 'POST',
        chargeId: chargeId,
        url: url
      })

      var startTime = new Date()
      baseClient.post(url, { correlationId: correlationId }, function (data, response) {
        logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'POST', url, new Date() - startTime)
        captureComplete(data, response, { resolve : resolve, reject : reject })
      }).on('error', function (err) {
            logger.info('[%s] - %s to %s ended - total time %dms', 'POST', correlationId, url, new Date() - startTime)
            logger.error('[%s] Calling connector to do capture failed -', correlationId, {
              service: 'connector',
              method: 'POST',
              chargeId: chargeId,
              url: url,
              error: err
            })
            captureFail(err, { resolve : resolve, reject : reject })
          })
    })

  }

  var cancel = function (chargeId) {

    return new Promise(function(resolve, reject){

      var url = connectorurl('cancel', {chargeId: chargeId})

      logger.debug('[%s] Calling connector to cancel a charge -', correlationId, {
        service: 'connector',
        method: 'POST',
        chargeId: chargeId,
        url: url
      })

      var startTime = new Date()
      baseClient.post(url, { correlationId: correlationId }, function (data, response) {
        logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'POST', url, new Date() - startTime)
        cancelComplete(data, response, { resolve : resolve, reject : reject })
      }).on('error', function (err) {
            logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'POST', url, new Date() - startTime)
            logger.error('[%s] Calling connector cancel a charge threw exception -', correlationId, {
              service: 'connector',
              method: 'POST',
              url: url,
              error: err
            })
            cancelFail(err, { resolve : resolve, reject : reject })
          })

    })

  }

  var cancelComplete = function (data, response, promise) {
    var code = response.statusCode
    if (code === 204) return promise.resolve()
    logger.error('[%s] Calling connector cancel a charge failed -', correlationId, {
      service: 'connector',
      method: 'POST',
      status: code
    })
    if (code === 400) return promise.reject(new Error('CANCEL_FAILED'))
    return promise.reject(new Error('POST_FAILED'))
  }

  var cancelFail = function (err, promise) {
    clientUnavailable(err, promise)
  }

  var findByToken = function (tokenId) {

    return new Promise(function(resolve, reject){

      logger.debug('[%s] Calling connector to find a charge by token -', correlationId, {
        service: 'connector',
        method: 'GET'
      })

      var startTime = new Date()
      var findByUrl = connectorurl('findByToken', {chargeTokenId: tokenId})

      baseClient.get(findByUrl, {correlationId: correlationId}, function (data, response) {
        logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'GET', findByUrl, new Date() - startTime)
        if (response.statusCode !== 200) {
          logger.warn('[%s] Calling connector to find a charge by token failed -', correlationId, {
            service: 'connector',
            method: 'GET',
            status: response.statusCode
          })
          reject(new Error('GET_FAILED'))
          return
        }
        resolve(data)
      }).on('error', function (err) {
        logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'GET', findByUrl, new Date() - startTime)
        logger.error('[%s] Calling connector to find a charge by token threw exception -', correlationId, {
          service: 'connector',
          method: 'GET',
          error: err
        })
        clientUnavailable(err, { resolve : resolve, reject : reject })
      })

    })

  }

  var captureComplete = function (data, response, promise) {
    var code = response.statusCode
    if (code === 204) return promise.resolve()
    if (code === 400) return promise.reject(new Error('CAPTURE_FAILED'))
    return promise.reject(new Error('POST_FAILED'))
  }

  var captureFail = function (err, promise) {
    clientUnavailable(err, promise)
  }

  var updateComplete = function (chargeId, data, response, promise) {
    if (response.statusCode !== 204) {
      logger.error('[%s] Calling connector to update charge status failed -', correlationId, {
        chargeId: chargeId,
        status: response.statusCode
      })
      promise.reject(new Error('UPDATE_FAILED'))
      return
    }

    promise.resolve({success: 'OK'})
  }

  var patch = function (chargeId, op, path, value) {

    return new Promise(function(resolve, reject){

      var startTime = new Date()
      var chargesUrl = process.env.CONNECTOR_HOST + '/v1/frontend/charges/'

      logger.debug('[%s] Calling connector to patch charge -', correlationId, {
        service: 'connector',
        method: 'PATCH'
      })

      var params = {
        data: {
          op: op,
          path: path,
          value: value
        },
        correlationId: correlationId
      }

      baseClient.patch(chargesUrl + chargeId, params, function (data, response) {
        logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'PATCH', chargesUrl, new Date() - startTime)
        var code = response.statusCode
        if (code === 200) {
          resolve()
        } else {
          reject()
        }
      }).on('error', function (err) {
        logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'PATCH', chargesUrl, new Date() - startTime)
        logger.error('[%s] Calling connector to patch a charge threw exception -', correlationId, {
          service: 'connector',
          method: 'PATCH',
          error: err
        })
        reject()
      })

    })

  }

  var clientUnavailable = function (error, promise) {
    promise.reject(new Error('CLIENT_UNAVAILABLE'), error)
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
