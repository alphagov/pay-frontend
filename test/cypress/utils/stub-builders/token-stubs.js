'use strict'

const { stubBuilder } = require('./stub-builder')
const paymentFixtures = require('../../../fixtures/payment.fixtures')

function connectorCreateChargeFromToken (opts) {
  const path = `/v1/frontend/tokens/${opts.tokenId}`
  return stubBuilder('GET', path, 200, {
    response: paymentFixtures.validChargeCreatedByToken(opts)
  })
}

function connectorMarkTokenAsUsed (tokenId) {
  const path = `/v1/frontend/tokens/${tokenId}/used`
  return stubBuilder('POST', path, 204)
}

function connectorChargeFromTokenNotFound (tokenId) {
  const path = `/v1/frontend/tokens/${tokenId}`
  return stubBuilder('GET', path, 404)
}

module.exports = {
  connectorCreateChargeFromToken,
  connectorMarkTokenAsUsed,
  connectorChargeFromTokenNotFound
}
