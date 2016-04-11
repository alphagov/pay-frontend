var should = require('chai').should();
var assert = require('assert');
var expect = require('chai').expect;
var fields= require(__dirname + '/../../app/utils/charge_validation_fields.js');



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
      var long = fields.fieldValidations.cardNo("42424242424242424242");

      expect(short).to.equal("number_incorrect_length");
      expect(long).to.equal("number_incorrect_length");

    });

    it('should return luhn invalid', function () {
      var result = fields.fieldValidations.cardNo("4242424242424241");
      expect(result).to.equal("luhn_invalid");
    });

  });

  describe('expiry month', function () {

    it('should true if correct', function () {
      var result = fields.fieldValidations.expiryMonth(12, {expiryYear: 16} );
      expect(result).to.equal(true);
    });

    it('should fails if month is too large or small', function () {
      var small = fields.fieldValidations.expiryMonth(0.1, {expiryYear: 16} );
      var large = fields.fieldValidations.expiryMonth(13, {expiryYear: 16} );
      var chars = fields.fieldValidations.expiryMonth("a12", {expiryYear: 16} );

      expect(small).to.equal("invalid_month");
      expect(large).to.equal("invalid_month");
      expect(chars).to.equal("invalid_month");
    });

    it('should fail is date is in past', function () {
      var month = fields.fieldValidations.expiryMonth(1, {expiryYear: 16} );
      var year = fields.fieldValidations.expiryMonth(1, {expiryYear: 15} );
      expect(month).to.equal("in_the_past");
      expect(year).to.equal("in_the_past");
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
      var result = fields.fieldValidations.addressPostcode("N4 2BQ");
      expect(result).to.equal(true);
    });

    it('should invalid length if too long', function () {
      var result = fields.fieldValidations.addressPostcode("N4 2BQQ");
      expect(result).to.equal("message");
    });

    it('should invalid length if too short', function () {
      var result = fields.fieldValidations.addressPostcode("N4");
      expect(result).to.equal("message");
    });

    it('should invalid length if undefined', function () {
      var result = fields.fieldValidations.addressPostcode(undefined);
      expect(result).to.equal("message");
    });

    it('should invalid length if empty', function () {
      var result = fields.fieldValidations.addressPostcode('');
      expect(result).to.equal("message");
    });
  });
});
