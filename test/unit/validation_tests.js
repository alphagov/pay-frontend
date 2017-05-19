var randomString = require('randomstring');
var validationLib = require(__dirname + '/../../app/utils/charge_validation_fields');
var cardFactory = require(__dirname + '/../../app/models/card.js');
var card = cardFactory();
var fieldValidators = validationLib(card).fieldValidations;

var chai = require('chai');
var expect = chai.expect;

describe('form validations', function () {
  it('should allow a correctly formatted email', function(){
    expect(fieldValidators.email("bob@bobbington.cbobbjb")).to.equal(true);
    expect(fieldValidators.email("b@bobbington.cbobbjb.dwf")).to.equal(true);
    expect(fieldValidators.email("customer/department=shipping@example.com")).to.equal(true);
  });

  it('should deny an incorrectly formatted email', function(){
    expect(fieldValidators.email("bob@bob")).to.equal("message");
    expect(fieldValidators.email("@bobbington.cbobbjb.dwf")).to.equal("message");
    expect(fieldValidators.email(123)).to.equal("message");
  });

  it('should deny a correctly formated email with the incorrect length', function(){
    expect(fieldValidators.email(randomString.generate(255)+"@bobbington.cbobbjb")).to.equal("invalid_length");
  });
});
