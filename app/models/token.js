const baseClient = require('../utils/base_client')
const logger = require('pino')()
const paths = require('../paths.js')

function clientUnavailable (error, promise) {
  promise.reject(new Error('CLIENT_UNAVAILABLE'), error)
}

function createUrl (resource, params) {
  return paths.generateRoute(`connectorCharge.${resource}`, params)
}

module.exports = function (correlationId) {
  correlationId = correlationId || ''
  return {
    destroy: function (tokenId) {
      return new Promise(function (resolve, reject) {
        logger.debug('[%s] Calling connector to delete a token -', correlationId, {
          service: 'connector',
          method: 'DELETE',
          url: createUrl('token', {chargeTokenId: '{tokenId}'})
        })
        const startTime = new Date()
        const deleteUrl = createUrl('token', {chargeTokenId: tokenId})
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
          clientUnavailable(err, { resolve: resolve, reject: reject })
        })
      })
    }
  }
}
