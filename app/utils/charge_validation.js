var changeCase      = require('change-case');
var customError  = {
  expiryYear:  {
    skip: true
  },
  expiryMonth:  {
    cssKey: "expiry-date"
  }
};


module.exports = function(translations, logger, Card) {
  'use strict';
  var validations     = require('./charge_validation_fields')(Card);
  var fieldValidations= validations.fieldValidations;
  var requiredFields  = validations.requiredFormFields;
  var creditCardType  = validations.creditCardType;
  var verify = function(body) {
    var checkResult = {
      hasError: false,
      errorFields: [],
      highlightErrorFields: {}
    },

    init = function(){
      for (var index in requiredFields) {
        if (requiredFields.hasOwnProperty(index)) {
          var name  = requiredFields[index];
          var value = body[name];
          checkFormField(name, value);
        }
      }

      if (checkResult.errorFields.length > 0) checkResult.hasError = true;
      logger.info("Card details check result: " + JSON.stringify(checkResult));
      return checkResult;
    },

    checkFormField = function(name, value) {
      var customValidation = checkFieldValidation(name, value);
      if (value && customValidation === true) return;
      var translation   = translations.fields[name],
      highlightMessage  = translation.message,
      problem           = !value ?  missing(name) : translation[customValidation];

      pushToErrorFields(name, problem, highlightMessage);
      pushToHighlightField(name, highlightMessage);

    },

    checkFieldValidation = function(name, value) {
      return (fieldValidations[name]) ? fieldValidations[name].bind(fieldValidations)(value,body) : true;
    },

    missing = function(name){
      var translation = translations.fields[name];
      return "Enter a valid " + translation.name;
    },

    pushToErrorFields = function(fieldName, problem) {
      var custom = customError[fieldName];
      var cssKey = changeCase.paramCase(fieldName);
      if (custom) {
        if (custom.skip) return;
        if (custom.cssKey) cssKey = custom.cssKey;
      }

      checkResult.errorFields.push({
        cssKey: cssKey,
        key: fieldName,
        value: problem
      });
    },

    pushToHighlightField = function(fieldName, highlightMessage) {
      var fields = checkResult.highlightErrorFields;
      fields[fieldName] = highlightMessage;
    };

    return init();
  };

  return {
    verify: verify,
    required: requiredFields,
    creditCardType: creditCardType,
    allowedCards: Card.allowed,
    cardNo: fieldValidations.cardNo
  };

};
