var should = require('chai').should();
var assert = require('assert');
var expect = require('chai').expect;
var cardTypes = require('../../test_helpers/test_helpers.js').cardTypes();
var Card  = require('../../../app/models/card.js')(cardTypes);
var fields= require('../../../app/utils/charge_validation_fields.js')(Card);


describe('card validation: cvc', function () {

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