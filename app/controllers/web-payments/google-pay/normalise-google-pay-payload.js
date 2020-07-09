'use strict'

const logger = require('../../../utils/logger')(__filename)
const { getLoggingFields } = require('../../../utils/logging_fields_helper')
const { output, redact } = require('../../../utils/structured_logging_value_helper')
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
      return 'visa'
    default:
      throw new Error('Unrecognised card brand in google pay payload')
  }
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
    last_digits_card_number: payload.details.paymentMethodData.info.cardDetails,
    brand: normaliseCardName(payload.details.paymentMethodData.info.cardNetwork),
    cardholder_name: nullable(payload.payerName || ''),
    email: nullable(payload.payerEmail || '')
  }

  const paymentData = humps.decamelizeKeys(JSON.parse(payload.details.paymentMethodData.tokenizationData.token))
  delete payload.details.paymentMethodData

  return {
    payment_info: paymentInfo,
    encrypted_payment_data: paymentData
  }
}
