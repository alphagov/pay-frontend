var should = require('chai').should();
var assert = require('assert');
var expect = require('chai').expect;
var cardTypes = require('../../test_helpers/test_helpers.js').cardTypes();
var Card  = require('../../../app/models/card.js')(cardTypes);
var fields= require('../../../app/utils/charge_validation_fields.js')(Card);

describe('card validation: postcode', function () {

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