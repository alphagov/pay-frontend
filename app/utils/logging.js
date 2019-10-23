'use strict'

const logger = require('./logger')(__filename)

exports.authChargePost = url => {
  logger.debug('Calling connector to authorize a charge (post card details) -', {
    service: 'connector',
    method: 'POST',
    url: url
  })
}

exports.failedChargePost = status => {
  logger.warn('Calling connector to authorize a charge (post card details) failed -', {
    service: 'connector',
    method: 'POST',
    status: status
  })
}

exports.failedChargePostException = err => {
  logger.error('Calling connector to authorize a charge (post card details) threw exception -', {
    service: 'connector',
    method: 'POST',
    error: err
  })
}

exports.failedChargePatch = err => {
  logger.warn('Calling connector to patch a charge failed -', {
    service: 'connector',
    method: 'PATCH',
    err: err
  })
}

exports.failedGetWorldpayDdcJwt = err => {
  logger.error('Calling connector to get a Worldpay 3DS Flex DDC JWT threw exception -', {
    service: 'connector',
    method: 'GET',
    error: err
  })
}

exports.systemError = function logSystemError (message, correlationId, chargeId, gatewayAccountId, gatewayAccountType) {
  const correlationID = correlationId || 'no-correlation-id'
  const chargeID = chargeId || 'no-charge-id'
  const gatewayAccountID = gatewayAccountId || 'no-gateway-account-id'
  const type = gatewayAccountType || 'no-gateway-account-type'
  const context = { correlationID, chargeID, gatewayAccountID, type }

  logger.error(`System error thrown, rendering technical problems page: ${message}`, context)
}
