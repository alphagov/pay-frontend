var should = require('chai').should();
var assert = require('assert');
var expect = require('chai').expect;
var cardTypes = require(__dirname + '/../test_helpers/test_helpers.js').cardTypes();
var Card  = require(__dirname + '/../../app/models/card.js')(cardTypes);
var fields= require(__dirname + '/../../app/utils/charge_validation_fields.js')(Card);

describe('charge validation fields', function () {

  describe('card number', function () {

    it('should return true when the card is correct', function () {
      var result = fields.fieldValidations.cardNo("4242424242424242");
      expect(result).to.equal(true);
    });

    it('should strip non numbers', function () {
      var result = fields.fieldValidations.cardNo("42424242424242dsakljl42");
      expect(result).to.equal(true);
    });

    it('should return incorrect length', function () {
      var short = fields.fieldValidations.cardNo("4242");
      var correct = fields.fieldValidations.cardNo("4917610000000000003");

      var long = fields.fieldValidations.cardNo("42424242424242424242");

      expect(short).to.equal("number_incorrect_length");
      expect(correct).to.equal(true);
      expect(long).to.equal("number_incorrect_length");

    });

    it('should return luhn invalid', function () {
      var result = fields.fieldValidations.cardNo("4242424242424241");
      expect(result).to.equal("luhn_invalid");
    });

    it('should return card_not_supported if the card is not supported', function () {
      var result = fields.fieldValidations.cardNo("6759649826438453");
      expect(result).to.equal("card_not_supported");
    });

  });

  describe('expiry month', function () {

    it('should true if correct', function () {
      var future = new Date();
      future.setDate(future.getDate() + 30);
      var fullYear = future.getFullYear().toString();

      var result = fields.fieldValidations.expiryMonth(12, {expiryYear: fullYear.substr(2,2)} );
      var longYear = fields.fieldValidations.expiryMonth(12, {expiryYear: fullYear} );

      expect(result).to.equal(true);
      expect(longYear).to.equal(true);

    });

    it('should fails if month is too large or small', function () {
      var small = fields.fieldValidations.expiryMonth(0.1, {expiryYear: 16} );
      var large = fields.fieldValidations.expiryMonth(13, {expiryYear: 16} );
      var chars = fields.fieldValidations.expiryMonth("a12", {expiryYear: 16} );

      expect(small).to.equal("invalid_month");
      expect(large).to.equal("invalid_month");
      expect(chars).to.equal("invalid_month");
    });

    it('should fails if year is not 2 or 4 digits', function () {
      var future = new Date();
      future.setDate(future.getDate() + 30);
      var fullYear = future.getFullYear().toString();

      var two = fields.fieldValidations.expiryMonth(12, {expiryYear: fullYear.substr(2,2)});
      var three = fields.fieldValidations.expiryMonth(12, {expiryYear: "016"} );
      var four = fields.fieldValidations.expiryMonth(12, {expiryYear: fullYear} );

      expect(two).to.equal(true);
      expect(three).to.equal("invalid_year");
      expect(four).to.equal(true);
    });

    it('should fail is date is in past', function () {
      var month = fields.fieldValidations.expiryMonth(1, {expiryYear: 16} );
      var year = fields.fieldValidations.expiryMonth(1, {expiryYear: 15} );
      var longYear = fields.fieldValidations.expiryMonth(1, {expiryYear: "2015"} );

      expect(month).to.equal("in_the_past");
      expect(year).to.equal("in_the_past");
      expect(longYear).to.equal("in_the_past");
    });

      it('should fail year is not defined', function () {
      var noYear = fields.fieldValidations.expiryMonth("12", {} );

      expect(noYear).to.equal("message");
    });
  });


  describe('cvc', function () {

    it('should true if correct', function () {
      var result = fields.fieldValidations.cvc("123");
      expect(result).to.equal(true);
    });

    it('should invalid length if too long', function () {
      var result = fields.fieldValidations.cvc("12345");
      expect(result).to.equal("invalid_length");
    });

    it('should invalid length if too short', function () {
      var result = fields.fieldValidations.cvc("12");
      expect(result).to.equal("invalid_length");
    });

    it('should invalid length if undefined', function () {
      var result = fields.fieldValidations.cvc(undefined);
      expect(result).to.equal("invalid_length");
    });

    it('should invalid length if empty', function () {
      var result = fields.fieldValidations.cvc('');
      expect(result).to.equal("invalid_length");
    });
  });

  describe('postcode', function () {

    it('should true if correct', function () {
      var result = fields.fieldValidations.addressPostcode("N4 2BQ", { addressCountry: "GB" });
      expect(result).to.equal(true);
    });

    it('should invalid length if too long', function () {
      var result = fields.fieldValidations.addressPostcode("N4 2BQQ", { addressCountry: "GB" });
      expect(result).to.equal("message");
    });

    it('should always validate if foreign country - undefined', function () {
      var result = fields.fieldValidations.addressPostcode(undefined,{ addressCountry: "FOO"});
      expect(result).to.equal(true);
    });

    it('should always validate if foreign country - bad format', function () {
      var result = fields.fieldValidations.addressPostcode("asdf",{ addressCountry: "FOO"});
      expect(result).to.equal(true);
    });

    it('should invalid length if too short', function () {
      var result = fields.fieldValidations.addressPostcode("N4", { addressCountry: "GB" });
      expect(result).to.equal("message");
    });

    it('should invalid length if undefined', function () {
      var result = fields.fieldValidations.addressPostcode(undefined, { addressCountry: "GB" });
      expect(result).to.equal("message");
    });

    it('should invalid length if empty', function () {
      var result = fields.fieldValidations.addressPostcode('', { addressCountry: "GB" });
      expect(result).to.equal("message");
    });
  });
});
