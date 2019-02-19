'use strict'

// NPM Dependencies
const humps = require('humps')

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

module.exports = payload => {
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
