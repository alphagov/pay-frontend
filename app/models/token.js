'use strict'

// Local dependencies
const connectorClient = require('../services/clients/connector_client')

const destroy = function (tokenId, correlationId) {
  return new Promise(function (resolve, reject) {
    correlationId = correlationId || ''
    connectorClient({ correlationId }).deleteToken({ tokenId })
      .then(response => {
        if (response.statusCode !== 204) {
          return reject(new Error('DELETE_FAILED'))
        }
        resolve(response.body)
      })
      .catch(err => {
        reject(new Error('CLIENT_UNAVAILABLE'), err)
      })
  })
}

module.exports = {
  destroy: destroy
}
