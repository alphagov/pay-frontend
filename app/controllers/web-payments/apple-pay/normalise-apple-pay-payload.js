'use strict'

const logger = require('../../../utils/logger')(__filename)
const { getLoggingFields } = require('../../../utils/logging-fields-helper')
const { output, redact } = require('../../../utils/structured-logging-value-helper')
const humps = require('humps')
const lodash = require('lodash')

const logSelectedPayloadProperties = req => {
  const payload = req.body

  const selectedPayloadProperties = lodash.pick(payload, [
    'token.paymentMethod.displayName',
    'token.paymentMethod.network',
    'token.paymentMethod.type',
    'shippingContact.givenName',
    'shippingContact.familyName',
    'shippingContact.emailAddress'
  ])

  if (lodash.has(payload, 'token.paymentMethod.displayName')) {
    selectedPayloadProperties.token.paymentMethod.displayName = output(payload.token.paymentMethod.displayName)
  }
  if (lodash.has(payload, 'token.paymentMethod.network')) {
    selectedPayloadProperties.token.paymentMethod.network = output(payload.token.paymentMethod.network)
  }
  if (lodash.has(payload, 'token.paymentMethod.type')) {
    selectedPayloadProperties.token.paymentMethod.type = output(payload.token.paymentMethod.type)
  }
  if (lodash.has(payload, 'shippingContact.givenName')) {
    selectedPayloadProperties.shippingContact.givenName = redact(payload.shippingContact.givenName)
  }
  if (lodash.has(payload, 'shippingContact.familyName')) {
    selectedPayloadProperties.shippingContact.familyName = redact(payload.shippingContact.familyName)
  }
  if (lodash.has(payload, 'shippingContact.emailAddress')) {
    selectedPayloadProperties.shippingContact.emailAddress = redact(payload.shippingContact.emailAddress)
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

const normaliseCardholderName = payload => {
  if (payload.shippingContact) {
    if (payload.shippingContact.givenName && payload.shippingContact.familyName) {
      return payload.shippingContact.givenName + ' ' + payload.shippingContact.familyName
    }
    if (payload.shippingContact.familyName) {
      return payload.shippingContact.familyName
    }
    if (payload.shippingContact.givenName) {
      return payload.shippingContact.givenName
    }
  }
  return null
}

const normaliseEmail = payload => {
  if (payload.shippingContact && payload.shippingContact.emailAddress) {
    return payload.shippingContact.emailAddress
  }
  return null
}

module.exports = req => {
  logSelectedPayloadProperties(req)

  const payload = req.body

  const paymentInfo = {
    last_digits_card_number: normaliseLastDigitsCardNumber(payload.token.paymentMethod.displayName),
    brand: normaliseCardName(payload.token.paymentMethod.network),
    card_type: payload.token.paymentMethod.type.toUpperCase(),
    cardholder_name: normaliseCardholderName(payload),
    email: normaliseEmail(payload),
    display_name: payload.token.paymentMethod.displayName,
    network: payload.token.paymentMethod.network,
    transaction_identifier: payload.token.transactionIdentifier
  }

  delete payload.token.paymentMethod
  delete payload.token.transactionIdentifier
  const paymentData = humps.decamelizeKeys(payload.token.paymentData)
  return {
    payment_info: paymentInfo,
    encrypted_payment_data: paymentData,
    payment_data: JSON.stringify(payload.token.paymentData)
  }
}
