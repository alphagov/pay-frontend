'use strict'

const logger = require('../../../utils/logger')(__filename)
const { getLoggingFields } = require('../../../utils/logging_fields_helper')
const { output, redact } = require('../../../utils/structured_logging_value_helper')
const userIpAddress = require('../../../utils/user_ip_address')
const humps = require('humps')

const logselectedPayloadProperties = req => {
  const selectedPayloadProperties = {}
  const payload = req.body

  if (payload.details && payload.details.paymentMethodData && payload.details.paymentMethodData.info) {
    selectedPayloadProperties.details = {}
    selectedPayloadProperties.details.paymentMethodData = {}
    selectedPayloadProperties.details.paymentMethodData.info = {}

    if ('cardDetails' in payload.details.paymentMethodData.info) {
      selectedPayloadProperties.details.paymentMethodData.info.cardDetails = output(payload.details.paymentMethodData.info.cardDetails)
    }

    if ('cardNetwork' in payload.details.paymentMethodData.info) {
      selectedPayloadProperties.details.paymentMethodData.info.cardNetwork = output(payload.details.paymentMethodData.info.cardNetwork)
    }

    if ('payerName' in payload) {
      selectedPayloadProperties.payerName = redact(payload.payerName)
    }

    if ('payerEmail' in payload) {
      selectedPayloadProperties.payerEmail = redact(payload.payerEmail)
    }
  }

  logger.info('Received Google Pay payload', {
    ...getLoggingFields(req),
    selected_payload_properties: selectedPayloadProperties
  })
}

const normaliseCardName = cardName => {
  switch (cardName) {
    case 'MASTERCARD':
      return 'master-card'
    case 'AMEX':
      return 'american-express'
    case 'VISA':
    case 'ELECTRON':
      return 'visa'
    case 'DISCOVER':
      return 'discover'
    case 'JCB':
      return 'jcb'
    default:
      throw new Error('Unrecognised card brand in Google Pay payload: ' + cardName)
  }
}

const normaliseLastDigitsCardNumber = cardDetails => {
  let lastDigitsCardNumber = ''

  if (cardDetails.match(/^[0-9]{4}$/)) {
    lastDigitsCardNumber = cardDetails
  }

  return lastDigitsCardNumber
}

const nullable = word => {
  if (word.length === 0 || !word.trim()) {
    return null
  }
  return word
}

module.exports = req => {
  logselectedPayloadProperties(req)

  const payload = req.body

  const paymentInfo = {
    last_digits_card_number: normaliseLastDigitsCardNumber(payload.details.paymentMethodData.info.cardDetails),
    brand: normaliseCardName(payload.details.paymentMethodData.info.cardNetwork),
    cardholder_name: nullable(payload.payerName || ''),
    email: nullable(payload.payerEmail || ''),
    accept_header: req.headers['accept-for-html'],
    user_agent_header: req.headers['user-agent'],
    ip_address: userIpAddress(req)
  }

  const paymentData = humps.decamelizeKeys(JSON.parse(payload.details.paymentMethodData.tokenizationData.token))
  delete payload.details.paymentMethodData

  return {
    payment_info: paymentInfo,
    encrypted_payment_data: paymentData
  }
}
