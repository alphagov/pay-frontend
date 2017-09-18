var baseClient = require('../utils/base_client')

var logger = require('pino')
var paths = require('../paths.js')

module.exports = function (correlationId) {
  'use strict'

  correlationId = correlationId || ''

  var createUrl = function (resource, params) {
    return paths.generateRoute(`connectorCharge.${resource}`, params)
  }

  var destroy = function (tokenId) {

    return new Promise(function(resolve, reject){

      logger.debug('[%s] Calling connector to delete a token -', correlationId, {
        service: 'connector',
        method: 'DELETE',
        url: createUrl('token', {chargeTokenId: '{tokenId}'})
      })

      var startTime = new Date()
      var deleteUrl = createUrl('token', {chargeTokenId: tokenId})

      baseClient.delete(deleteUrl, { correlationId: correlationId }, function (data, response) {
        logger.info('[%s] - %s to %s ended - total time %dms', 'DELETE',
            correlationId, deleteUrl, new Date() - startTime)

        if (response.statusCode !== 204) {
          logger.warn('Calling connector to delete a token failed -', {
            service: 'connector',
            method: 'DELETE',
            url: createUrl('token', {chargeTokenId: '{tokenId}'})
          })
          return reject(new Error('DELETE_FAILED'))
        }
        resolve(data)
      }).on('error', function (err) {
        logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'DELETE', deleteUrl, new Date() - startTime)
        logger.error('[%s] Calling connector to delete a token threw exception -', correlationId, {
          service: 'connector',
          method: 'DELETE',
          url: createUrl('token', {chargeTokenId: '{tokenId}'}),
          error: err
        })
        clientUnavailable(err,  { resolve : resolve, reject : reject })
      })

    })

  }

  var clientUnavailable = function (error, promise) {
    promise.reject(new Error('CLIENT_UNAVAILABLE'), error)
  }

  return {
    destroy: destroy
  }
}
