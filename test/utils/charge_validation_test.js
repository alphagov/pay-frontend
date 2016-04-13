var should = require('chai').should();
var assert = require('assert');
var expect = require('chai').expect;
var charge = require(__dirname + '/../../app/utils/charge_validation.js');
var i18n   = require('i18n');
var _      = require('lodash');

i18n.setLocale('en');
var validator = charge(i18n.__("chargeController.fieldErrors"),{info: ()=>{}});

describe('charge validator', function () {

  describe('when there is an error, hasError should be true', function () {
    var verification = validator.verify({});
    expect(verification.hasError).to.be.true;
  });

  describe('when there is an error, all required should be in errorFields', function () {
    var verification = validator.verify({});
    expect(verification.hasError).to.be.true;
    _.each(validator.required, function(required) {
        var validation = _.filter(verification.errorFields, function(e) {
          return e.key == required;
        });
        expect(validation).to.not.be.undefined;
    });
  });

  describe('when there is an error, all required should be in hightlighterrorFields', function () {
    var verification = validator.verify({});
    expect(verification.highlightErrorFields).to.have.all.keys(validator.required);
  });


  describe('when there is an error in a custom field it should use the custom validation', function () {
    var verification = validator.verify({"cardNo" : "4242"});
    var cardNoVerification = _.filter(verification.errorFields, function(e) {
      return e.key == "cardNo";
    })[0];
    expect(cardNoVerification.value).to.eq('your Card number is not of the correct length');
  });




});
