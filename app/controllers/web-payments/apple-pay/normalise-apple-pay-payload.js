'use strict'

// NPM Dependencies
const humps = require('humps')

const normaliseCardName = cardName => {
  const lowerCaseCardName = cardName.toLowerCase()
  switch (lowerCaseCardName) {
    case 'mastercard':
      return 'master-card'
    case 'amex':
      return 'american-express'
    case 'visa':
      return 'visa'
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

const normaliseLastDigitsCardNumber = displayName => displayName.substr(displayName.length - 4)

module.exports = payload => {
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
