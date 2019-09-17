'use strict'

// Local dependencies
const connectorClient = require('../services/clients/connector_client')

const markTokenAsUsed = async function (tokenId, correlationId) {
  let response
  try {
    response = await connectorClient({ correlationId }).markTokenAsUsed({ tokenId })
  } catch (err) {
    console.log('throw client unavailable')
    throw new Error('CLIENT_UNAVAILABLE', err)
  }
  if (response.statusCode !== 204) {
    console.log('non 204 status code')
    throw new Error('MARKING_TOKEN_AS_USED_FAILED')
  }
  return response.body
}

module.exports = {
  markTokenAsUsed: markTokenAsUsed
}
