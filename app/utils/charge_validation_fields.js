var luhn = require('luhn');
var ukPostcode = require("uk-postcode");
var creditCardType = require('credit-card-type');
var cards = require('../models/card').allowed;

module.exports.creditCardType = creditCardType;
module.exports.allowedCards = cards;
module.exports.requiredFormFields = [
"cardholderName",
"cardNo",
"cvc",
"expiryMonth",
"expiryYear",
"addressLine1",
"addressCity",
"addressPostcode"
];

module.exports.fieldValidations = {
  cardNo:  function(cardNo, allFields) {
    if (!cardNo) return "message"; // default message

    cardNo = cardNo.replace(/\D/g,'');
    var valid = luhn.validate(cardNo);
    if (!cardNo ||  cardNo.length < 12 || cardNo.length > 16) return 'number_incorrect_length';
    if (!valid) return "luhn_invalid";
    return true;
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
    if (currentDate.getFullYear() == cardDate.getFullYear() &&
        currentDate.getMonth() > cardDate.getMonth()) return "in_the_past";

    return true;
  },

  cvc: function(code, allFields) {
    if(code === undefined) return "invalid_length";
    code = code.replace(/\D/g,'');
    if (code.length === 3 || code.length === 4) {
        return true;
    }
    return "invalid_length";
  },

  addressPostcode: function(AddressPostcode, allfields){
    var postCode = ukPostcode.fromString(AddressPostcode);
    if (postCode.isComplete()) { return true; }
    return "message";
  },
  creditCardType: creditCardType
};

