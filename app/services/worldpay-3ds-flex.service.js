'use strict'

const connectorClient = require('./clients/connector.client')

const getDdcJwt = async function getDdcJwt (charge, correlationId, loggingFields = {}) {
  if (charge.paymentProvider === 'worldpay' &&
    charge.gatewayAccount.requires3ds &&
    charge.gatewayAccount.integrationVersion3ds === 2) {
    const response = await connectorClient({ correlationId }).getWorldpay3dsFlexJwt({ chargeId: charge.id }, loggingFields)
    if (response.status !== 200) {
      throw new Error('Failed to get DDC JWT from connector')
    }
    return response.data.jwt
  }
  return null
}

module.exports = {
  getDdcJwt
}
