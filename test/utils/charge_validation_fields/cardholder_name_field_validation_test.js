'use strict'

const {expect} = require('chai')
var cardTypes = require('../../test_helpers/test_helpers.js').cardTypes()
var Card = require('../../../app/models/card.js')(cardTypes)
var fields = require('../../../app/utils/charge_validation_fields.js')(Card)

let result

describe('card validation: cardholder name', function () {
  describe('should validate if it is not suspected of containing a PAN or CVV', () => {
    it('and it contains only text', () => {
      result = fields.fieldValidations.cardholderName('Mr Peter Griffin')
      expect(result).to.equal(true)
    })

    it('and it contains only 2 consecutive digits', () => {
      result = fields.fieldValidations.cardholderName('Mr Peter Griffin 22')
      expect(result).to.equal(true)
    })

    it('and it contains only 3 non-consecutive digits', () => {
      result = fields.fieldValidations.cardholderName('Mr Peter 2 Griffin 22')
      expect(result).to.equal(true)
    })

    it('and it contains only 4 non-consecutive digits', () => {
      result = fields.fieldValidations.cardholderName('Mr Peter 22 Griffin 22')
      expect(result).to.equal(true)
    })

    it('and it contains 11 digits', () => {
      result = fields.fieldValidations.cardholderName('Mr Peter Griffin 01234567890')
      expect(result).to.equal(true)
    })
  })

  describe('should not validate if it contains a suspected PAN', () => {
    it('and it consists entirely of an excessive amount of digits', () => {
      result = fields.fieldValidations.cardholderName('012345678901')
      expect(result).to.equal('contains_too_many_digits')
    })

    it('and it contains both text and excessive consecutive digits', () => {
      result = fields.fieldValidations.cardholderName('Mr Peter Griffin 01234567890121')
      expect(result).to.equal('contains_too_many_digits')
    })

    it('and it contains both text and excessive non-consecutive digits', () => {
      result = fields.fieldValidations.cardholderName('Mr Peter 0123-45 Gri--ffin 678901')
      expect(result).to.equal('contains_too_many_digits')
    })
  })

  describe('it should not validate if it contains a suspected CVV', () => {
    it('because it consists of a number that is 3 digits long', () => {
      result = fields.fieldValidations.cardholderName(170)
      expect(result).to.equal('contains_suspected_cvv')
    })

    it('because it consists of a number that is 4 digits long', () => {
      result = fields.fieldValidations.cardholderName(1760)
      expect(result).to.equal('contains_suspected_cvv')
    })

    it('because it consists entirely of 3 consecutive digits', () => {
      result = fields.fieldValidations.cardholderName('170')
      expect(result).to.equal('contains_suspected_cvv')
    })

    it('because it consists entirely of 4 consecutive digits', () => {
      result = fields.fieldValidations.cardholderName('1760')
      expect(result).to.equal('contains_suspected_cvv')
    })

    it('because it consists entirely of 3 consecutive digits surrounded by spaces', () => {
      result = fields.fieldValidations.cardholderName(' 170 ')
      expect(result).to.equal('contains_suspected_cvv')
    })

    it('because it consists entirely of 4 consecutive digits surrounded by spaces', () => {
      result = fields.fieldValidations.cardholderName(' 1760 ')
      expect(result).to.equal('contains_suspected_cvv')
    })
  })
})
