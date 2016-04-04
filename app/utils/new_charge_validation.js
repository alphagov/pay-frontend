var i18n            = require('i18n');
var luhn            = require('luhn');
var changeCase      = require('change-case');
var _               = require('lodash');
var logger          = require('winston');

var REQUIRED_FORM_FIELDS = [
"cardholderName",
"cardNo",
"cvc",
"expiryMonth",
"expiryYear",
"addressLine1",
"addressPostcode"
];

var customValidations = {
  cardNo:  function(cardNo) {
    var valid = luhn.validate(cardNo);
    if (!valid) return "luhn_invalid";
    return true;
  },

  expiryMonth:  function(expiryMonth, allFields) {
    // month is zero indexed
    expiryMonth = expiryMonth -1;
    var isValidMonth = /^\d+$/.test(expiryMonth) && expiryMonth >= 0 && expiryMonth <= 11;
    if (!isValidMonth) return "invalid_month";

    var cardDate = new Date("20" + allFields.expiryYear,expiryMonth-1);
    var currentDate = new Date();
    if (currentDate.getFullYear() > cardDate.getFullYear()) return "in_the_past";
    if (currentDate.getFullYear() == cardDate.getFullYear() &&
        currentDate.getMonth() > cardDate.getMonth) return "in_the_past";

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
    var customValidation = checkFieldValidation(name, value);
    if (value && customValidation === true) return;
    var translation   = translations.fields[name],
    highlightMessage  = translation.message,
    problem = !value ?  missing(name) : translation[customValidation];

    pushToErrorFields(name, problem, highlightMessage);
  },

  checkFieldValidation = function(name, value) {
    return (customValidations[name]) ? customValidations[name](value,body) : true;
  },

  missing = function(name){
    var translation = translations.fields[name];
    return `${translation.name} ${translations.missing}`;
  },

  pushToErrorFields = function(fieldName, problem, highlightMessage){
    checkResult.highlightErrorFields[fieldName] = highlightMessage;
    checkResult.errorFields.push({
      key: changeCase.paramCase(fieldName),
      value: `${problem}`
    });
  };

  return init();
};
