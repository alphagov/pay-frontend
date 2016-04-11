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
});
