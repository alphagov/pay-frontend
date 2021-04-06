'use strict'

var expect = require('chai').expect
var cardTypes = require('../../test_helpers/test_helpers.js').cardTypes()
var Card = require('../../../app/models/card.js')(cardTypes)
var fields = require('../../../app/utils/charge_validation_fields.js')(Card)

let result

describe('card validation: address', () => {
  describe('addressLine1', function () {
    describe('should validate if does not contain 12 digits', () => {
      it('and it contains only text', () => {
        result = fields.fieldValidations.addressLine1('Spooner Street')
        expect(result).to.equal(true)
      })

      it('and it contains 11 digits', () => {
        result = fields.fieldValidations.addressLine1('Spooner Street 01234567890')
        expect(result).to.equal(true)
      })
    })

    describe('should not validate if it contains 12 or more digits', () => {
      it('and it contains only digits', () => {
        result = fields.fieldValidations.addressLine1('012345678901')
        expect(result).to.equal('containsTooManyDigits')
      })

      it('and it contains both digits and text and the digits are consecutive', () => {
        result = fields.fieldValidations.addressLine1('Spooner Street 012345678901')
        expect(result).to.equal('containsTooManyDigits')
      })

      it('and it contains both digits and text and the digits are not consecutive', () => {
        result = fields.fieldValidations.addressLine2('Spoo-012345-ner-678901-Street')
        expect(result).to.equal('containsTooManyDigits')
      })
    })
  })

  describe('addressLine2', function () {
    describe('should validate if does not contain 12 digits', () => {
      it('and it contains only text', () => {
        result = fields.fieldValidations.addressLine2('Spooner Street')
        expect(result).to.equal(true)
      })

      it('and it contains 11 digits', () => {
        result = fields.fieldValidations.addressLine2('Spooner Street 01234567890')
        expect(result).to.equal(true)
      })
    })

    describe('should not validate if it contains 12 or more digits', () => {
      it('and it contains only digits', () => {
        result = fields.fieldValidations.addressLine2('012345678901')
        expect(result).to.equal('containsTooManyDigits')
      })

      it('and it contains both digits and text and the digits are consecutive', () => {
        result = fields.fieldValidations.addressLine2('Spooner Street 0123456789012')
        expect(result).to.equal('containsTooManyDigits')
      })

      it('and it contains both digits and text and the digits are not consecutive', () => {
        result = fields.fieldValidations.addressLine2('Spoo-012345-ner-678901-Street')
        expect(result).to.equal('containsTooManyDigits')
      })
    })
  })

  describe('addressCity', function () {
    describe('should validate if does not contain 12 digits', () => {
      it('and it contains only text', () => {
        result = fields.fieldValidations.addressCity('Mr Quahog')
        expect(result).to.equal(true)
      })

      it('and it contains 11 digits', () => {
        result = fields.fieldValidations.addressCity('Mr Quahog 01234567890')
        expect(result).to.equal(true)
      })
    })

    describe('should not validate if it contains 12 or more digits', () => {
      it('and it contains only digits', () => {
        result = fields.fieldValidations.addressCity('012345678901')
        expect(result).to.equal('containsTooManyDigits')
      })

      it('and it contains both digits and text and the digits are consecutive', () => {
        result = fields.fieldValidations.addressCity('Quahog 012345678901')
        expect(result).to.equal('containsTooManyDigits')
      })

      it('and it contains both digits and text and the digits are not consecutive', () => {
        result = fields.fieldValidations.addressCity('Qua-012345-h-678901-og')
        expect(result).to.equal('containsTooManyDigits')
      })
    })
  })
})
