'use strict'

// Local dependencies
const paymentsClient = require('../services/clients/payments.client')

const markTokenAsUsed = async function (tokenId, correlationId, loggingFields = {}) {
  let response
  try {
    response = await paymentsClient.markTokenAsUsed(tokenId, loggingFields)
  } catch (err) {
    throw new Error('CLIENT_UNAVAILABLE', err)
  }
  if (response.statusCode !== 204) {
    throw new Error('MARKING_TOKEN_AS_USED_FAILED')
  }
  return response.body
}

module.exports = {
  markTokenAsUsed: markTokenAsUsed
}
