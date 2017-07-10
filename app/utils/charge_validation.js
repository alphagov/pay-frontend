var chargeValidationFields = require('./charge_validation_fields')
var changeCase = require('change-case')
var customError = {
  expiryYear: {
    skip: true
  },
  expiryMonth: {
    cssKey: 'expiry-date'
  }
}

module.exports = function (translations, logger, Card) {
  'use strict'
  var validations = chargeValidationFields(Card)
  var fieldValidations = validations.fieldValidations
  var requiredFields = validations.requiredFormFields
  var optionalFields = validations.optionalFormFields

  var creditCardType = validations.creditCardType
  var verify = function (body) {
    var checkResult = {
      hasError: false,
      errorFields: [],
      highlightErrorFields: {}
    }

    var init = function () {
      var field
      for (var i = 0; i < requiredFields.length; i++) {
        field = requiredFields[i]
        checkRequiredFormField(field, body[field])
      }

      for (var j = 0; j < optionalFields.length; j++) {
        field = optionalFields[j]
        if (body[field]) checkOptionalFormField(field, body[field])
      }

      if (checkResult.errorFields.length > 0) checkResult.hasError = true
      return checkResult
    }

    var checkRequiredFormField = function (name, value) {
      var customValidation = checkFieldValidation(name, value)
      if (value && customValidation === true) return
      var translation = translations.fields[name]
      var highlightMessage = translation.message
      var problem = !value ? missing(name) : translation[customValidation]

      pushToErrorFields(name, problem)
      pushToHighlightField(name, highlightMessage)
    }

    var checkOptionalFormField = function (name, value) {
      var customValidation = checkFieldValidation(name, value)
      if (value && customValidation === true) return
      var translation = translations.fields[name]
      var highlightMessage = translation.message
      var problem = translation[customValidation]

      pushToErrorFields(name, problem)
      pushToHighlightField(name, highlightMessage)
    }

    var checkFieldValidation = function (name, value) {
      return (fieldValidations[name]) ? fieldValidations[name].bind(fieldValidations)(value, body) : true
    }

    var missing = function (name) {
      var translation = translations.fields[name]
      return 'Enter a valid ' + translation.name
    }

    var pushToErrorFields = function (fieldName, problem) {
      var custom = customError[fieldName]
      var cssKey = changeCase.paramCase(fieldName)
      if (custom) {
        if (custom.skip) return
        if (custom.cssKey) cssKey = custom.cssKey
      }

      checkResult.errorFields.push({
        cssKey: cssKey,
        key: fieldName,
        value: problem
      })
    }

    var pushToHighlightField = function (fieldName, highlightMessage) {
      var fields = checkResult.highlightErrorFields
      fields[fieldName] = highlightMessage
    }

    return init()
  }

  return {
    verify: verify,
    required: requiredFields,
    optional: optionalFields,
    creditCardType: creditCardType,
    allowedCards: Card.allowed,
    cardNo: fieldValidations.cardNo
  }
}
