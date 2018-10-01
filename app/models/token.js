'use strict'

// NPM dependencies
const logger = require('winston')

// Local dependencies
const paths = require('../paths.js')
const baseClient = require('../utils/base_client')

const createUrl = function (resource, params) {
  return paths.generateRoute(`connectorCharge.${resource}`, params)
}

const destroy = function (tokenId, correlationId) {
  return new Promise(function (resolve, reject) {
    correlationId = correlationId || ''
    logger.debug('[%s] Calling connector to delete a token -', correlationId, {
      service: 'connector',
      method: 'DELETE',
      url: createUrl('token', {chargeTokenId: '{tokenId}'})
    })
    const startTime = new Date()
    const deleteUrl = createUrl('token', {chargeTokenId: tokenId})
    baseClient.delete(deleteUrl, {correlationId: correlationId}, function (data, response) {
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
      reject(new Error('CLIENT_UNAVAILABLE'), err)
    })
  })
}

module.exports = {
  destroy: destroy
}
