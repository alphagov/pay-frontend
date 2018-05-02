'use strict'

// npm dependencies
const ukPostcode = require('uk-postcode')
const rfc822Validator = require('rfc822-validate')

// local dependencies
const luhn = require('./luhn')
const creditCardType = require('credit-card-type')
const emailTools = require('./email_tools')

// constants
const EMAIL_MAX_LENGTH = 254
const REQUIRED_FORM_FIELDS = [
  'cardNo',
  'expiryMonth',
  'expiryYear',
  'cardholderName',
  'cvc',
  'addressLine1',
  'addressCity',
  'addressPostcode',
  'email',
  'addressCountry'
]

const OPTIONAL_FORM_FIELDS = [
  'addressLine2'
]

module.exports = Card => {
  /*
   These are custom validations for each field.
   Functions should be named the same as the input name
   and will receive two arguments.
   One is the field, second is allfields in case it is
   needed for validation.
   */
  return {
    creditCardType: creditCardType,
    allowedCards: Card.allowed,
    requiredFormFields: REQUIRED_FORM_FIELDS,
    fieldValidations: {
      cardNo: cardNo.bind(Card),
      expiryMonth,
      cvc,
      addressPostcode,
      email,
      cardholderName,
      addressLine1: addressLine,
      addressLine2: addressLine,
      addressCity: addressLine,
      creditCardType: creditCardType,
      allowedCards: Card.allowed
    },
    optionalFormFields: OPTIONAL_FORM_FIELDS
  }
}

// Validation Functions
function expiryMonth (expiryMonth, allFields) {
  let expiryYear = allFields.expiryYear
  if (!expiryMonth || !expiryYear) return 'message'

  // validations for both expiry month and year are done together in 'expiryMonth'
  // it can't be renamed as it all runs off meta programming further up the stack
  expiryMonth = expiryMonth - 1 // month is zero indexed
  if (!(/^\d+$/.test(expiryMonth) && expiryMonth >= 0 && expiryMonth <= 11)) return 'invalid_month'
  if (![2, 4].includes(String(allFields.expiryYear).length)) return 'invalid_year'
  if (`${expiryYear}`.length === 2) expiryYear = '20' + expiryYear
  const cardDate = new Date(expiryYear, expiryMonth)
  const currentDate = new Date()
  if (currentDate.getFullYear() > cardDate.getFullYear()) return 'in_the_past'
  if (currentDate.getFullYear() === cardDate.getFullYear() && currentDate.getMonth() > cardDate.getMonth()) return 'in_the_past'

  return true
}
function cvc (code) {
  if (!code || ![3, 4].includes(code.replace(/\D/g, '').length)) return 'invalid_length'
  return true
}
function addressPostcode (postcode, allFields) {
  if (allFields.addressCountry === 'GB' && !ukPostcode.fromString(postcode).isComplete()) return 'message'
  if (containsSuspectedPAN(postcode)) return 'contains_too_many_digits'
  return true
}
function email (email) {
  if (email && email.length > EMAIL_MAX_LENGTH) return 'invalid_length'
  if (containsSuspectedPAN(email)) return 'contains_too_many_digits'
  if (!rfc822Validator(email)) return 'message'
  const domain = emailTools.validEmail(email).domain
  return domain && domain.indexOf('.') === -1 ? 'message' : true
}
function cardholderName (name) {
  if (containsSuspectedPAN(name)) return 'contains_too_many_digits'
  if (containsSuspectedCVV(name)) return 'contains_suspected_cvv'
  return true
}
function addressLine (addressLine) {
  return !containsSuspectedPAN(addressLine) || 'contains_too_many_digits'
}
function containsSuspectedPAN (input) {
  if (!['string', 'number'].includes(typeof input)) return false
  const matchedDigits = String(input).match(/(\d)/g)
  return (matchedDigits !== null) && (matchedDigits.length > 11)
}
function containsSuspectedCVV (input) {
  if (!['string', 'number'].includes(typeof input)) return false
  return /^\s*\d{3,4}\s*$/.test(String(input))
}
// Must be bound prior to use
function cardNo (cardNo) {
  if (!cardNo) return 'message' // default message
  cardNo = cardNo.replace(/\D/g, '')
  const cardType = creditCardType(cardNo)
  if (!cardNo || cardNo.length < 12 || cardNo.length > 19) return 'number_incorrect_length'
  if (!luhn.validate(cardNo)) return 'luhn_invalid'
  if (!cardType[0]) return 'card_not_supported'
  return this.allowed.map(card => card.brand).includes(cardType[0].type) || 'card_not_supported'
}
