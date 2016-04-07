var changeCase      = require('change-case');
var validations     = require('./charge_validation_fields');
var fieldValidations= validations.fieldValidations;
var requiredFields  = validations.requiredFormFields;

module.exports = function(translations,logger) {

  var verify = function(body){
    var checkResult = {
      hasError: false,
      errorFields: [],
      highlightErrorFields: {}
    },

    init = function(){
      for (var index in requiredFields) {
        var name = requiredFields[index],
        value    = body[name];
        checkFormField(name,value);
      }

      if (checkResult.errorFields.length > 0) checkResult.hasError = true;
      console.info("Card details check result: "+JSON.stringify(checkResult));
      return checkResult;
    },

    checkFormField = function(name, value){
      var customValidation = checkFieldValidation(name, value);
      if (value && customValidation === true) return;
      var translation   = translations.fields[name],
      highlightMessage  = translation.message,
      problem           = !value ?  missing(name) : translation[customValidation];

      pushToErrorFields(name, problem, highlightMessage);
    },

    checkFieldValidation = function(name, value) {
      return (fieldValidations[name]) ? fieldValidations[name](value,body) : true;
    },

    missing = function(name){
      var translation = translations.fields[name];
      return "Enter a valid " + translation.name;
    },

    pushToErrorFields = function(fieldName, problem, highlightMessage){
      checkResult.highlightErrorFields[fieldName] = highlightMessage;
      checkResult.errorFields.push({
        cssKey: changeCase.paramCase(fieldName),
        key: fieldName,
        value: problem
      });
    };
    return init();
  };

  return {
    verify: verify,
    required: requiredFields
  };

};
