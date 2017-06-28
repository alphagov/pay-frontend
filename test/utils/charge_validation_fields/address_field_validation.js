'use strict';

var assert = require('assert');
var expect = require('chai').expect;
var cardTypes = require('../../test_helpers/test_helpers.js').cardTypes();
var Card  = require('../../../app/models/card.js')(cardTypes);
var fields= require('../../../app/utils/charge_validation_fields.js')(Card);

let result;

describe('card validation: address', () => {

  describe('addressLine1', function () {
    describe('should validate if does not contain 10 consecutive digits', () => {

      it('and it contains only text', () => {
        result = fields.fieldValidations.addressLine1('Spooner Street');
        expect(result).to.equal(true);
      });

      it('and it contains 9 consecutive digits', () => {
        result = fields.fieldValidations.addressLine1('Spooner Street 123456789');
        expect(result).to.equal(true);
      });

      it('and it contains 10 non-consecutive digits', () => {
        result = fields.fieldValidations.addressLine1('012345 Spooner Street 6789');
        expect(result).to.equal(true);
      });

    });

    describe('should not validate if it contains 10 consecutive digits', () => {
      it('and it contains only digits', () => {
        result = fields.fieldValidations.addressLine1('0123456789');
        expect(result).to.equal('contains_too_many_digits');
      });

      it('and it contains both digits and text', () => {
        result = fields.fieldValidations.addressLine1('Spooner Street 0123456789');
        expect(result).to.equal('contains_too_many_digits');
      });
    });

  });

  describe('addressLine2', function () {
    describe('should validate if does not contain 10 consecutive digits', () => {

      it('and it contains only text', () => {
        result = fields.fieldValidations.addressLine2('Spooner Street');
        expect(result).to.equal(true);
      });

      it('and it contains 9 consecutive digits', () => {
        result = fields.fieldValidations.addressLine2('Spooner Street 123456789');
        expect(result).to.equal(true);
      });

      it('and it contains 10 non-consecutive digits', () => {
        result = fields.fieldValidations.addressLine2('012345 Spooner Street 6789');
        expect(result).to.equal(true);
      });

    });

    describe('should not validate if it contains 10 consecutive digits', () => {
      it('and it contains only digits', () => {
        result = fields.fieldValidations.addressLine2('0123456789');
        expect(result).to.equal('contains_too_many_digits');
      });

      it('and it contains both digits and text', () => {
        result = fields.fieldValidations.addressLine2('Spooner Street 0123456789');
        expect(result).to.equal('contains_too_many_digits');
      });
    });

  });

  describe('addressCity', function () {
    describe('should validate if does not contain 10 consecutive digits', () => {

      it('and it contains only text', () => {
        result = fields.fieldValidations.addressCity('Mr Quahog');
        expect(result).to.equal(true);
      });

      it('and it contains 9 consecutive digits', () => {
        result = fields.fieldValidations.addressCity('Mr Quahog 123456789');
        expect(result).to.equal(true);
      });

      it('and it contains 10 non-consecutive digits', () => {
        result = fields.fieldValidations.addressCity('012345 Quahog 6789');
        expect(result).to.equal(true);
      });

    });

    describe('should not validate if it contains 10 consecutive digits', () => {
      it('and it contains only digits', () => {
        result = fields.fieldValidations.addressCity('0123456789');
        expect(result).to.equal('contains_too_many_digits');
      });

      it('and it contains both digits and text', () => {
        result = fields.fieldValidations.addressCity('Quahog 0123456789');
        expect(result).to.equal('contains_too_many_digits');
      });
    });

  });

});