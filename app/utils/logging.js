'use strict'

const logger = require('./logger')(__filename)

exports.authChargePost = (url, loggingFields = {}) => {
  logger.debug('Calling connector to authorize a charge (post card details)', {
    ...loggingFields,
    service: 'connector',
    method: 'POST',
    url: url
  })
}

exports.failedChargePost = (status, loggingFields = {}) => {
  logger.warn('Calling connector to authorize a charge (post card details) failed', {
    ...loggingFields,
    service: 'connector',
    method: 'POST',
    status: status
  })
}

exports.failedChargePostException = (err, loggingFields = {}) => {
  logger.error('Calling connector to authorize a charge (post card details) threw exception', {
    ...loggingFields,
    service: 'connector',
    method: 'POST',
    error: err
  })
}

exports.failedChargePatch = (err, loggingFields = {}) => {
  logger.warn('Calling connector to patch a charge failed', {
    ...loggingFields,
    service: 'connector',
    method: 'PATCH',
    err: err
  })
}

exports.failedGetWorldpayDdcJwt = (err, loggingFields = {}) => {
  logger.error('Calling connector to get a Worldpay 3DS Flex DDC JWT threw exception', {
    ...loggingFields,
    service: 'connector',
    method: 'GET',
    error: err
  })
}
