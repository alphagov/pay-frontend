var luhn = require('./luhn');
var ukPostcode = require("uk-postcode");
var creditCardType = require('credit-card-type');
var rfc822Validator = require('rfc822-validate');
var emailTools = require('./email_tools');
var EMAIL_MAX_LENGTH = 254;

module.exports = function(Card){
  "use strict";
  var requiredFormFields = [
    "cardNo",
    "expiryMonth",
    "expiryYear",
    "cardholderName",
    "cvc",
    "addressLine1",
    "addressCity",
    "addressPostcode",
    "email",
    "addressCountry"
  ];

  const optionalFormFields = [
    'addressLine2'
  ];

  var validateEmail = function(email) {
    var validEmail = rfc822Validator(email),
      domain;

    if (!validEmail) {
      return "message";
    } else {
      domain = emailTools(email).domain;
      if (domain && domain.indexOf('.') === -1) {
        return "message";
      }
      return true;
    }
  };

  function hasTooManyDigits(input) {
    if (!input || typeof input !== 'string') return false;
    const matchedDigits = input.match(/(\d)/g);
    return (matchedDigits !== null) && (matchedDigits.length >= 10) ;
  }

  function isValidPostcode(postcode, countryCode) {
    return !(countryCode === "GB" && !ukPostcode.fromString(postcode).isComplete());
  }

  /*
   These are custom validations for each field.
   Functions should be named the same as the input name
   and will receive two arguments.
   One is the field, second is allfields in case it is
   needed for validation.
   */

  var fieldValidations = {
    cardNo:  function(cardNo) {
      if (!cardNo) return "message"; // default message
      cardNo        = cardNo.replace(/\D/g,'');
      var cardType  = creditCardType(cardNo);
      var valid     = luhn.validate(cardNo);
      if (!cardNo ||  cardNo.length < 12 || cardNo.length > 19) return 'number_incorrect_length';
      if (!valid) return "luhn_invalid";
      if(!cardType[0]) return "card_not_supported";
      for (var i = 0; i < this.allowedCards.length; i++) {
        if (this.allowedCards[i].brand === cardType[0].type) return true;
      }
      return "card_not_supported";
    },


    expiryMonth:  function(expiryMonth, allFields) {
      var expiryYear = allFields.expiryYear;
      if (expiryMonth === undefined || expiryMonth === "") return "message";
      if (expiryYear  === undefined || expiryYear === "") return "message";



      // month is zero indexed
      expiryMonth = expiryMonth -1;
      var isValidMonth = /^\d+$/.test(expiryMonth) && expiryMonth >= 0 && expiryMonth <= 11;
      if (!isValidMonth) return "invalid_month";
      // validations are grouped for expiry month and year,
      // this is why both validations are happening in expiry month
      // can;t be renamed as it all runs off meta programming further up the stack
      var isValidYear = (String(allFields.expiryYear).length === 2 || String(allFields.expiryYear).length === 4);
      if (!isValidYear) return "invalid_year";

      var cardDate = allFields.expiryYear;
      if (String(allFields.expiryYear).length === 2) cardDate = "20" + cardDate;
      cardDate = new Date(cardDate,expiryMonth);

      var currentDate = new Date();
      if (currentDate.getFullYear() > cardDate.getFullYear()) return "in_the_past";
      if (currentDate.getFullYear() === cardDate.getFullYear() &&
        currentDate.getMonth() > cardDate.getMonth()) return "in_the_past";

      return true;
    },

    cvc: function(code) {
      if(code === undefined) return "invalid_length";
      code = code.replace(/\D/g,'');
      if (code.length === 3 || code.length === 4) {
        return true;
      }
      return "invalid_length";
    },

    addressPostcode: function(addressPostcode, allFields){
      if (!isValidPostcode(addressPostcode, allFields.addressCountry)) return 'message';
      if (hasTooManyDigits(addressPostcode)) return 'contains_too_many_digits';
      return true;
    },

    email: function(email){
      if (email && email.length > EMAIL_MAX_LENGTH) return "invalid_length";
      if (hasTooManyDigits(email)) return 'contains_too_many_digits';
      return validateEmail(email);
    },

    cardholderName: function(name) {
      return !hasTooManyDigits(name) || 'contains_too_many_digits';
    },

    addressLine1: function(addressLine) {
      return !hasTooManyDigits(addressLine) || 'contains_too_many_digits';
    },

    addressLine2: function(addressLine) {
      return !hasTooManyDigits(addressLine) || 'contains_too_many_digits';
    },

    addressCity: function(townCity) {
      return !hasTooManyDigits(townCity) || 'contains_too_many_digits';
    },

    creditCardType: creditCardType,
    allowedCards: Card.allowed
  };

  return {
    creditCardType: creditCardType,
    allowedCards: Card.allowed,
    requiredFormFields: requiredFormFields,
    fieldValidations: fieldValidations,
    optionalFormFields: optionalFormFields
  };

};
