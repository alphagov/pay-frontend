'use strict'

// Local dependencies
const connectorClient = require('../services/clients/connector-axios.client')

const SUCCESS_CODES = [200, 201, 202, 204, 206]

const markTokenAsUsed = async function (tokenId, loggingFields = {}) {
  let response
  try {
    response = await connectorClient().markTokenAsUsed({ tokenId }, loggingFields)
    if (!SUCCESS_CODES.includes(response.status)) {
      throw new Error('CLIENT_UNAVAILABLE')
    }
  } catch (err) {
    throw new Error('CLIENT_UNAVAILABLE', err)
  }

  if (response.status !== 204) {
    throw new Error('MARKING_TOKEN_AS_USED_FAILED')
  }
  return response.data
}

module.exports = {
  markTokenAsUsed: markTokenAsUsed
}
