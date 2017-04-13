var luhn = require('./luhn');
var ukPostcode = require("uk-postcode");
var creditCardType = require('credit-card-type');
var rfc822-validator = require('rfc822-validate');
var emailTools = require('email-tools');
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

  var validateEmail = function(email) {
    var validEmail = rfc822-validator(email),
        domain;

    if (!validEmail) {
      return "message";
    } else {
      domain = emailTools(email).domain;
      if (domain.indexOf('.') === -1) {
        return "message";
      }
      return true;
    }
  };

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

    addressPostcode: function(AddressPostcode, allFields){
      if (allFields.addressCountry !== "GB") return true;
      var postCode = ukPostcode.fromString(AddressPostcode);
      if (postCode.isComplete()) { return true; }
      return "message";
    },

    email: function(email){
      if (email && email.length > EMAIL_MAX_LENGTH) return "invalid_length";
      return validateEmail(email);
    },

    creditCardType: creditCardType,
    allowedCards: Card.allowed
  };

  return {
    creditCardType: creditCardType,
    allowedCards: Card.allowed,
    requiredFormFields: requiredFormFields,
    fieldValidations: fieldValidations
  };

};
