'use strict'

// Polyfill for ZAP webdriver
require('polyfill-array-includes')

// NPM dependencies
const ukPostcode = require('uk-postcode')
const rfc822Validator = require('rfc822-validate')

// Local dependencies
const luhn = require('./luhn')
const creditCardType = require('credit-card-type')
const emailTools = require('./email-tools')

// Constants
const EMAIL_MAX_LENGTH = 254

const REQUIRED_FORM_FIELDS = [
  'cardNo',
  'expiryMonth',
  'expiryYear',
  'cardholderName',
  'cvc',
  'email'
]
const REQUIRED_BILLING_ADDRESS_FORM_FIELDS = [
  'addressLine1',
  'addressCity',
  'addressPostcode',
  'addressCountry'
]

const OPTIONAL_FORM_FIELDS = [
]
const OPTIONAL_BILLING_ADDRESS_FORM_FIELDS = [
  'addressLine2'
]

module.exports = (Card, chargeOptions = { collect_billing_address: true }) => {
  /*
     These are custom validations for each field.
     Functions should be named the same as the input name
     and will receive two arguments.
     One is the field, second is allfields in case it is
     needed for validation.
     */
  const chargeValidationFields = {
    creditCardType: creditCardType,
    allowedCards: Card.allowed,
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
    requiredFormFields: REQUIRED_FORM_FIELDS,
    optionalFormFields: OPTIONAL_FORM_FIELDS
  }

  if (chargeOptions.collect_billing_address === true) {
    chargeValidationFields.requiredFormFields = [...REQUIRED_FORM_FIELDS, ...REQUIRED_BILLING_ADDRESS_FORM_FIELDS]
    chargeValidationFields.optionalFormFields = [...OPTIONAL_FORM_FIELDS, ...OPTIONAL_BILLING_ADDRESS_FORM_FIELDS]
  }

  return chargeValidationFields
}

// Validation Functions

function expiryMonth (expiryMonth, allFields) {
  // validations for both expiry month and year are done together in 'expiryMonth'
  // it can't be renamed as it all runs off meta programming further up the stack
  const expiryYear = allFields.expiryYear

  if (!expiryMonth || !expiryYear) {
    return 'message'
  }

  if (!(/^[1-9]$/.test(expiryMonth)) && !(/^0[1-9]$/).test(expiryMonth) && !(/^1[0-2]$/.test(expiryMonth))) {
    return 'invalidMonth'
  }

  const expiryMonthInt = parseInt(expiryMonth, 10)

  if (!(/^[0-9]{2}$/.test(expiryYear)) && !(/^[1-9][0-9]{3}$/).test(expiryYear)) {
    return 'invalidYear'
  }

  const expiryYearInt = expiryYear.length === 2 ? 2000 + parseInt(expiryYear, 10) : parseInt(expiryYear, 10)

  if (expiryYearInt > 2099) {
    return 'invalidYear'
  }

  const now = new Date()

  if (expiryYearInt < now.getFullYear()) {
    return 'inThePast'
  }

  if (expiryYearInt === now.getFullYear() && expiryMonthInt < now.getMonth() + 1) {
    return 'inThePast'
  }

  return true
}

function cvc (code) {
  if (!code || ![3, 4].includes(code.replace(/\D/g, '').length)) return 'invalidLength'
  return true
}

function addressPostcode (postcode, allFields) {
  if (allFields.addressCountry === 'GB' && !ukPostcode.fromString(postcode).isComplete()) return 'message'
  if (containsSuspectedPAN(postcode)) return 'containsTooManyDigits'
  return true
}

function email (email, allFields, chargeOptions = {}) {
  if (((email || '') === '' && (chargeOptions && chargeOptions.email_collection_mode === 'OPTIONAL')) ||
      chargeOptions.email_collection_mode === 'OFF') return { emptyOrCustomValidationAllowed: true }
  if (email && email.length > EMAIL_MAX_LENGTH) return 'invalidLength'
  if (emailValidation(email)) return 'containsTooManyDigits'
  if (!rfc822Validator(email)) return 'message'
  const domain = emailTools.validEmail(email).domain
  return domain && domain.indexOf('.') === -1 ? 'message' : true
}

function cardholderName (name) {
  if (containsSuspectedPAN(name)) return 'containsTooManyDigits'
  if (containsSuspectedCVV(name)) return 'containsSuspectedCVC'
  return true
}

function addressLine (addressLine) {
  return !containsSuspectedPAN(addressLine) || 'containsTooManyDigits'
}

function containsSuspectedPAN (input) {
  if (!['string', 'number'].includes(typeof input)) return false
  const matchedDigits = String(input).match(/(\d)/g)
  return (matchedDigits !== null) && (matchedDigits.length > 11)
}

function emailValidation (input) {
  const matchedDigits = String(input).match(/[0-9 ]{11,}/)
  return matchedDigits !== null
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
  if (!cardNo || cardNo.length < 12 || cardNo.length > 19) return 'numberIncorrectLength'
  if (!luhn.validate(cardNo)) return 'luhnInvalid'
  if (!cardType[0]) return 'cardNotSupported'
  return this.allowed.filter(card => card.brand === cardType[0].type).length > 0 || 'cardNotSupported'
}
