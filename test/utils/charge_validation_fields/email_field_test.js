'use strict';

var assert = require('assert');
var expect = require('chai').expect;
var cardTypes = require('../../test_helpers/test_helpers.js').cardTypes();
var Card  = require('../../../app/models/card.js')(cardTypes);
var fields= require('../../../app/utils/charge_validation_fields.js')(Card);

let result;

describe('card validation: email', function () {
  describe('should validate if does not contain 10 consecutive digits', () => {
    
    it('and it contains only text', () => {
      result = fields.fieldValidations.email('pumpkinlover@example.com');
      expect(result).to.equal(true);
    });
    
    it('and it contains 9 consecutive digits', () => {
      result = fields.fieldValidations.email('pumpkinlover123456789@example.com');
      expect(result).to.equal(true);
    });

    it('and it contains 10 non-consecutive digits', () => {
      result = fields.fieldValidations.email('pumpkinlover123456@example7890.com');
      expect(result).to.equal(true);
    });
    
  });

  it('should not validate if it contains 10 consecutive digits', () => {
      result = fields.fieldValidations.email('1234567890@example.com');
      expect(result).to.equal('contains_too_many_digits');
  });

});