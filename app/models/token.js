var baseClient = require('../utils/base_client2')

var q = require('q')
var logger = require('winston')
var paths = require('../paths.js')

module.exports = function (correlationId) {
  'use strict'

  correlationId = correlationId || ''

  var createUrl = function (resource, params) {
    return paths.generateRoute(`connectorCharge.${resource}`, params)
  }

  var destroy = function (tokenId) {
    var defer = q.defer()
    logger.debug('[%s] Calling connector to delete a token -', correlationId, {
      service: 'connector',
      method: 'DELETE',
      url: createUrl('token', {chargeTokenId: '{tokenId}'})
    })

    var startTime = new Date()
    var deleteUrl = createUrl('token', {chargeTokenId: tokenId})

    baseClient.delete(deleteUrl, { correlationId: correlationId }, function (err, data) {
      logger.info('[%s] - %s to %s ended - total time %dms', 'DELETE',
        correlationId, deleteUrl, new Date() - startTime)
      if (err) {
        logger.error('[%s] Calling connector to delete a token threw exception -', correlationId, {
          service: 'connector',
          method: 'DELETE',
          url: createUrl('token', {chargeTokenId: '{tokenId}'}),
          error: err
        })
        return clientUnavailable(err, defer)
      }
      if (data.statusCode !== 204) {
        logger.warn('Calling connector to delete a token failed -', {
          service: 'connector',
          method: 'DELETE',
          url: createUrl('token', {chargeTokenId: '{tokenId}'})
        })
        return defer.reject(new Error('DELETE_FAILED'))
      }
      defer.resolve(data.body)
    }).on('error', function (err) {
      logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'DELETE', deleteUrl, new Date() - startTime)
      logger.error('[%s] Calling connector to delete a token threw exception -', correlationId, {
        service: 'connector',
        method: 'DELETE',
        url: createUrl('token', {chargeTokenId: '{tokenId}'}),
        error: err
      })
      clientUnavailable(err, defer)
    })
    return defer.promise
  }

  var clientUnavailable = function (error, defer) {
    defer.reject(new Error('CLIENT_UNAVAILABLE'), error)
  }

  return {
    destroy: destroy
  }
}
