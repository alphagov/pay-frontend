var should = require('chai').should();
var assert = require('assert');
var expect = require('chai').expect;
var charge = require(__dirname + '/../../app/utils/charge_validation.js');
var i18n   = require('i18n');
var _      = require('lodash');
var Card  = require(__dirname + '/../../app/models/card.js');


i18n.setLocale('en');
var validator = charge(i18n.__("chargeController.fieldErrors"),{info: ()=>{}},Card);

describe('charge validator', function () {

  it('when there is an error, hasError should be true', function () {
    var verification = validator.verify({});
    expect(verification.hasError).to.be.true;
  });

  it('when there is an error, all required should be in errorFields', function () {
    var verification = validator.verify({});
    expect(verification.hasError).to.be.true;
    _.each(validator.required, function(required) {
        var validation = _.filter(verification.errorFields, function(e) {
          return e.key == required;
        });
        expect(validation).to.not.be.undefined;
    });
  });

  it('when there is an error, all required should be in hightlighterrorFields', function () {
    var verification = validator.verify({});
    expect(verification.highlightErrorFields).to.have.all.keys(validator.required);
  });

  it('when there is an error in a custom field it should use the custom validation', function () {
    var verification = validator.verify({"cardNo" : "4242"});
    var cardNoVerification = _.filter(verification.errorFields, function(e) {
      return e.key == "cardNo";
    })[0];
    expect(cardNoVerification.value).to.eq('Card number is not the correct length');
  });

});
