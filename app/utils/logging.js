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
    status_code: status
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
    error: err
  })
}

exports.worldpay3dsFlexDdcStatus = (ddcStatus, loggingFields = {}) => {
  logger.info(`Payment details submitted for a Worldpay 3DS Flex charge. DDC status is: ${ddcStatus}`, {
    ...loggingFields,
    worldpay_3ds_flex_ddc_status: ddcStatus
  })
}
