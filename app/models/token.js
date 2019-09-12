'use strict'

// Local dependencies
const connectorClient = require('../services/clients/connector_client')

const markTokenAsUsed = function (tokenId, correlationId) {
  return new Promise(function (resolve, reject) {
    correlationId = correlationId || ''
    connectorClient({ correlationId }).markTokenAsUsed({ tokenId })
      .then(response => {
        if (response.statusCode !== 204) {
          return reject(new Error('MARKING_TOKEN_AS_USED_FAILED'))
        }
        resolve(response.body)
      })
      .catch(err => {
        reject(new Error('CLIENT_UNAVAILABLE'), err)
      })
  })
}

module.exports = {
  markTokenAsUsed: markTokenAsUsed
}
