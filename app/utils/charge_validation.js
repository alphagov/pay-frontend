'use strict'

// npm dependencies
const changeCase = require('change-case')

// local dependencies
const chargeValidationFields = require('./charge_validation_fields')

// constants
const CUSTOM_ERRORS = {
  expiryYear: {
    skip: true
  },
  expiryMonth: {
    cssKey: 'expiry-date'
  }
}

module.exports = (translations, logger, Card) => {
  const validations = chargeValidationFields(Card)
  const fieldValidations = validations.fieldValidations
  return {
    required: validations.requiredFormFields,
    optional: validations.optionalFormFields,
    creditCardType: validations.creditCardType,
    allowedCards: Card.allowed,
    cardNo: fieldValidations.cardNo,
    verify: (body) => {
      const checkResult = {
        hasError: false,
        errorFields: [],
        highlightErrorFields: {}
      }
      validations.requiredFormFields.forEach(field => checkFormField(field, body[field], false))
      validations.optionalFormFields.forEach(field => {
        if (body[field]) checkFormField(field, body[field])
      })

      if (checkResult.errorFields.length > 0) checkResult.hasError = true
      return checkResult

      function checkFormField (name, value, isOptional) {
        const customValidation = fieldValidations[name] ? fieldValidations[name].bind(fieldValidations)(value, body) : true
        if (value && customValidation === true) return
        const translation = translations.fields[name]
        const messageTemplate = translations.generic
        const problem = value || isOptional ? translation[customValidation] : messageTemplate.replace('%s', translation.name)
        // Push to Error Fields
        const customError = CUSTOM_ERRORS[name] || {}
        const cssKey = customError.cssKey || changeCase.paramCase(name)
        if (!customError.skip) checkResult.errorFields.push({cssKey, key: name, value: problem})
        // Push to Highlight Fields
        checkResult.highlightErrorFields[name] = translation.message
      }
    }
  }
}
