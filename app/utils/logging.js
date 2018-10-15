'use strict'

// npm dependencies
const logger = require('winston')

exports.authChargePost = url => {
  logger.debug('Calling connector to authorize a charge (post card details) -', {
    service: 'connector',
    method: 'POST',
    url: url
  })
}

exports.failedChargePost = (status, url) => {
  logger.warn('Calling connector to authorize a charge (post card details) failed -', {
    service: 'connector',
    method: 'POST',
    status: status,
    url: url
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
