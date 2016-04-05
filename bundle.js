(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports.cardValidations = require('./utils/charge_validation_fields');

},{"./utils/charge_validation_fields":2}],2:[function(require,module,exports){
var luhn = require('luhn');

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
    var valid = luhn.validate(cardNo);
    if (!valid) return "luhn_invalid";
    return true;
  },

  expiryMonth:  function(expiryMonth, allFields) {
    // month is zero indexed
    var isValidMonth = /^\d+$/.test(expiryMonth) && expiryMonth >= 0 && expiryMonth <= 11;
    if (!isValidMonth) return "invalid_month";

    var cardDate = new Date("20" + allFields.expiryYear,expiryMonth-1);
    var currentDate = new Date();
    if (currentDate.getFullYear() > cardDate.getFullYear()) return "in_the_past";
    if (currentDate.getFullYear() == cardDate.getFullYear() &&
        currentDate.getMonth() > cardDate.getMonth()) return "in_the_past";

    return true;
  }
};

},{"luhn":3}],3:[function(require,module,exports){
"use strict",module.exports=function(){function a(a){var b=a.trim(),c=b.length,d=parseInt(b,10),e=0,f,g;if(c===0)return!0;if(isNaN(d)||!/^[0-9]+$/.test(b))return!1;for(var h=c;h>0;h--){f=Math.floor(d)%10,e+=f,h--,d/=10,f=Math.floor(d)%10,g=f*2;switch(g){case 10:g=1;break;case 12:g=3;break;case 14:g=5;break;case 16:g=7;break;case 18:g=9;break;default:g=g}d/=10,e+=g}return e%10===0}return{validate:a}}();
},{}]},{},[1]);
