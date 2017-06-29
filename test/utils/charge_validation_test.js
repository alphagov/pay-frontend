const should = require('chai').should();
const assert = require('assert');
const expect = require('chai').expect;
const charge = require('../../app/utils/charge_validation.js');
const i18n   = require('i18n');
const _      = require('lodash');
const Card   = require('../../app/models/card.js')();
let result;
i18n.setLocale('en');
const validator = charge(i18n.__("chargeController.fieldErrors"),{info: ()=>{}},Card);

describe('charge validator', () => {

  describe('Method: verify', () => {

    it('when there is any sort of error, the hasError property of the returned object should be true', () => {
      result = validator.verify({});
      expect(result.hasError).to.equal(true);
    });

    describe('when there is an error in a required field', () => {
      before(() => {
        result = validator.verify({"cardNo" : "4242"});
      });

      it('it should add any fields containing errors to the \'errorFields\' array of the returned object', () => {
        const errorFields = result.errorFields.map(field => field.key);
        expect(errorFields.length).to.equal(validator.required.length - 1); // month/year combined for this
      });

      it('it should add any fields containing errors to the \'highlightErrorFields\' array of the returned object', () => {
        const highlightErrorFields = Object.keys(result.highlightErrorFields);
        expect(highlightErrorFields.length).to.equal(validator.required.length);
      });

      it('it should run custom validators against any defined fields', () => {
        expect(result.errorFields.find(field => field.key === 'cardNo').value).to.eq('Card number is not the correct length');
      });
    });

    describe('when there is an error in an optional field', () => {
      before(() => {
        result = validator.verify({"addressLine2" : "012345678901 Cheese Avenue"});

      });

      it('it should add any fields containing errors to the \'errorFields\' array of the returned object', () => {
        const errorFields = result.errorFields.map(field => field.key).filter(field => validator.optional.includes(field));
        expect(errorFields.length).to.equal(1);
      });

      it('it should add any fields containing errors to the \'highlightErrorFields\' array of the returned object', () => {
        const highlightErrorFields = Object.keys(result.highlightErrorFields).filter(field => validator.optional.includes(field));
        expect(highlightErrorFields.length).to.equal(1);
      });

      it('it should run custom validators against any defined fields', () => {
        expect(result.errorFields.find(field => field.key === 'addressLine2').value).to.eq('Enter valid address information');
      });
    });
  });







});
