'use strict'

const connectorClient = require('./clients/connector_client')

const getDdcJwt = async function getDdcJwt (charge, correlationId) {
  if (charge.gatewayAccount.paymentProvider === 'worldpay' &&
    charge.gatewayAccount.requires3ds &&
    charge.gatewayAccount.integrationVersion3ds === 2) {
    const data = await connectorClient({ correlationId }).getWorldpay3dsFlexJwt({ chargeId: charge.id })
    return data.body.jwt
  }
  return null
}

module.exports = {
  getDdcJwt
}
