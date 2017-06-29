'use strict';

var assert = require('assert');
var expect = require('chai').expect;
var cardTypes = require('../../test_helpers/test_helpers.js').cardTypes();
var Card  = require('../../../app/models/card.js')(cardTypes);
var fields= require('../../../app/utils/charge_validation_fields.js')(Card);

let result;

describe('card validation: cardholder name', function () {
  describe('should validate if does not contain 12 digits', () => {
    
    it('and it contains only text', () => {
      result = fields.fieldValidations.cardholderName('Mr Peter Griffin');
      expect(result).to.equal(true);
    });
    
    it('and it contains 11 digits', () => {
      result = fields.fieldValidations.cardholderName('Mr Peter Griffin 01234567890');
      expect(result).to.equal(true);
    });

    
  });

  describe('should not validate if it contains 12 or more digits', () => {
    it('and it contains only digits', () => {
      result = fields.fieldValidations.cardholderName('012345678901');
      expect(result).to.equal('contains_too_many_digits');
    });

    it('and it contains both digits and text and the digits are consecutive', () => {
      result = fields.fieldValidations.cardholderName('Mr Peter Griffin 01234567890121');
      expect(result).to.equal('contains_too_many_digits');
    });

    it('and it contains both digits and text and the digits are not consecutive', () => {
      result = fields.fieldValidations.cardholderName('Mr Peter 0123-45 Gri--ffin 678901');
      expect(result).to.equal('contains_too_many_digits');
    });
  });

});