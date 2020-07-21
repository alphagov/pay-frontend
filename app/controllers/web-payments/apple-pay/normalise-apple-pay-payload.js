'use strict'

const logger = require('../../../utils/logger')(__filename)
const { getLoggingFields } = require('../../../utils/logging_fields_helper')
const { output, redact } = require('../../../utils/structured_logging_value_helper')
const humps = require('humps')

const logselectedPayloadProperties = req => {
  const selectedPayloadProperties = {}
  const payload = req.body

  if (payload.token) {
    selectedPayloadProperties.token = {}

    if (payload.token.paymentMethod) {
      selectedPayloadProperties.token.paymentMethod = {}

      if ('displayName' in payload.token.paymentMethod) {
        selectedPayloadProperties.token.paymentMethod.displayName = output(payload.token.paymentMethod.displayName)
      }

      if ('network' in payload.token.paymentMethod) {
        selectedPayloadProperties.token.paymentMethod.network = output(payload.token.paymentMethod.network)
      }

      if ('type' in payload.token.paymentMethod) {
        selectedPayloadProperties.token.paymentMethod.type = output(payload.token.paymentMethod.type)
      }
    }

    if (payload.shippingContact) {
      selectedPayloadProperties.shippingContact = {}

      if ('givenName' in payload.shippingContact) {
        selectedPayloadProperties.shippingContact.givenName = redact(payload.shippingContact.givenName)
      }

      if ('familyName' in payload.shippingContact) {
        selectedPayloadProperties.shippingContact.familyName = redact(payload.shippingContact.familyName)
      }

      if ('emailAddress' in payload.shippingContact) {
        selectedPayloadProperties.shippingContact.emailAddress = redact(payload.shippingContact.emailAddress)
      }
    }
  }

  logger.info('Received Apple Pay payload', {
    ...getLoggingFields(req),
    selected_payload_properties: selectedPayloadProperties
  })
}

const normaliseCardName = cardName => {
  const lowerCaseCardName = cardName.toLowerCase()
  switch (lowerCaseCardName) {
    case 'mastercard':
      return 'master-card'
    case 'amex':
      return 'american-express'
    case 'visa':
    case 'electron':
      return 'visa'
    case 'discover':
      return 'discover'
    case 'jcb':
      return 'jcb'
    case 'maestro':
      return 'maestro'

    default:
      throw new Error('Unrecognised card brand in Apple Pay payload: ' + cardName)
  }
}

const nullable = word => {
  if (word.length === 0 || !word.trim()) {
    return null
  }
  return word
}

const normaliseLastDigitsCardNumber = displayName => {
  let lastDigitsCardNumber = ''
  if (displayName.length >= 4) {
    const lastFourChars = displayName.substr(-4)
    if (lastFourChars.match(/[0-9]{4}/)) {
      lastDigitsCardNumber = lastFourChars
    }
  }
  return lastDigitsCardNumber
}

module.exports = req => {
  logselectedPayloadProperties(req)

  const payload = req.body

  const paymentInfo = {
    last_digits_card_number: normaliseLastDigitsCardNumber(payload.token.paymentMethod.displayName),
    brand: normaliseCardName(payload.token.paymentMethod.network),
    card_type: payload.token.paymentMethod.type.toUpperCase(),
    cardholder_name: nullable(payload.shippingContact.givenName + ' ' + payload.shippingContact.familyName),
    email: nullable(payload.shippingContact.emailAddress)
  }

  delete payload.token.paymentMethod
  delete payload.token.transactionIdentifier
  const paymentData = humps.decamelizeKeys(payload.token.paymentData)
  return {
    payment_info: paymentInfo,
    encrypted_payment_data: paymentData
  }
}
