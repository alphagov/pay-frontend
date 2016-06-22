var luhn = require('luhn');
var ukPostcode = require("uk-postcode");
var creditCardType = require('credit-card-type');
var validateEmail = require('rfc822-validate');

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
    "email"
  ];

  /*
   These are customs validaitons for each field,
   fucntion should be named the same as the input name,
   and will receive two arguments, one is the field,
   second is allfields in case ti is needed for vlaidation.
  */

  var fieldValidations = {
    cardNo:  function(cardNo) {
      if (!cardNo) return "message"; // default message
      cardNo        = cardNo.replace(/\D/g,'');
      var cardType  = creditCardType(cardNo);
      var valid     = luhn.validate(cardNo);
      if (!cardNo ||  cardNo.length < 12 || cardNo.length > 16) return 'number_incorrect_length';
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

      var cardDate = new Date("20" + allFields.expiryYear,expiryMonth);
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

    addressPostcode: function(AddressPostcode){
      var postCode = ukPostcode.fromString(AddressPostcode);
      if (postCode.isComplete()) { return true; }
      return "message";
    },

    email: function(email){
      var valid = validateEmail(email);
      if (valid) return true;
      return "message";
    },

    creditCardType: creditCardType,
    allowedCards: Card.allowed
  };

  return {
    creditCardType: creditCardType,
    allowedCards: Card.allowed,
    requiredFormFields: requiredFormFields,
    fieldValidations: fieldValidations,
  };

};





