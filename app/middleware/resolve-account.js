'use strict'

const { getLoggingFields } = require('../utils/logging-fields-helper')
const { CORRELATION_HEADER } = require('../../config/correlation-header')
const connectorClient = require('../services/clients/connector.client')

module.exports = async function resolveAccount (req, res, next) {
  try {
    const accountId = req.chargeData && req.chargeData.gateway_account_id
    const correlationId = req.headers[CORRELATION_HEADER]
    // TODO set the gateway account on the charge to mimic the behaviour of getting the charge from connector
    const response = await connectorClient({ correlationId }).getGatewayAccount(accountId, getLoggingFields(req))
    if (response.statusCode !== 200) {
      next(new Error('Non-success response when getting gateway account. Status code ' + response.statusCode))
    }
    req.chargeData.gateway_account = response.body
    next()
  } catch (err) {
    next(err)
  }
}
