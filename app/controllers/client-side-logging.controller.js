'use strict'

const { getLoggingFields } = require('../utils/logging-fields-helper')
const logger = require('../utils/logger')(__filename)

const LOG_CODES = {
  ApplePayAvailable: 'Apple Pay is available on this device',
  ApplePayStarted: 'User chose Apple Pay method',
  ApplePayMerchantIdNotValid: 'Apple Pay Merchant ID not valid',
  ApplePayMerchantValidationError: 'Error completing Apple Pay merchant validation',
  GooglePayAvailable: 'Google Pay is available on this device',
  GooglePayStarted: 'User chose Google Pay method',
  GooglePayAborted: 'Google Pay attempt aborted by user'
}

function log (req, res) {
  const code = req.body && req.body.code
  if (LOG_CODES.hasOwnProperty(code)) { // eslint-disable-line
    logger.info(LOG_CODES[code], getLoggingFields(req))
  } else {
    logger.info('Client side logging endpoint called with invalid log code')
  }
  res.sendStatus(200)
}

module.exports = {
  log
}
