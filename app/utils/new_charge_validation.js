var i18n            = require('i18n');
var luhn            = require('luhn');
var string          = require('string');
var changeCase      = require('change-case');
var _               = require('lodash');
var logger          = require('winston');

var REQUIRED_FORM_FIELDS = [
"cardholderName",
"cardNo",
"cvc",
"expiryDate",
"addressLine1",
"addressPostcode"
];

var customValidations = {
  cardNo:  (cardNo)=> {
    var valid = luhn.validate(cardNo);
    if (!valid) return "luhn_invalid";
    return true;
  }
};

module.exports = function(body) {
  var translations    = i18n.__(`chargeController.fieldErrors`);
  var checkResult = {
    hasError: false,
    errorFields: [],
    highlightErrorFields: {}
  },

  init = function(){
    for (var index in REQUIRED_FORM_FIELDS) {
      var name = REQUIRED_FORM_FIELDS[index],
      value    = body[name];
      checkFormField(name,value);
    }

    if (checkResult.errorFields.length > 0) checkResult.hasError = true;
    logger.info("Card details check result: "+JSON.stringify(checkResult));
    return checkResult;
  },

  checkFormField = function(name, value){
    var translation   = translations.fields[name],
    customValidation  = checkFieldValidation(name, value);
    if (value && customValidation === true) return;

    var problem = !value ? translations.missing : translation[customValidation];
    pushToErrorFields(name, translation.name, problem);
    checkResult.highlightErrorFields[name] = translation.message;
  },

  checkFieldValidation = function(name, value) {
    return (customValidations[name]) ? customValidations[name](value) : true;
  },

  pushToErrorFields = function(fieldName, humanName, problem){
    checkResult.errorFields.push({
      key: changeCase.paramCase(fieldName),
      value: `${humanName} ${problem}`
    });
  };

  return init();
};
