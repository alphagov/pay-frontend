'use strict'

var expect = require('chai').expect
var cardTypes = require('../../test_helpers/test_helpers.js').cardTypes()
var Card = require('../../../app/models/card.js')(cardTypes)
var fields = require('../../../app/utils/charge_validation_fields.js')(Card)

let result

describe('card validation: email', function () {
  describe('should validate if does not contain 12 digits', () => {
    it('and it contains only text', () => {
      result = fields.fieldValidations.email('pumpkinlover@example.com')
      expect(result).to.equal(true)
    })

    it('and it contains 11 digits', () => {
      result = fields.fieldValidations.email('pumpkinlover1234567890@example.com')
      expect(result).to.equal(true)
    })
  })

  describe('should not validate if it contains 12 or more digits', () => {
    it('and the digits are consecutive', () => {
      result = fields.fieldValidations.email('1234567890123@example.com')
      expect(result).to.equal('containsTooManyDigits')
    })

    it('and the digits are not consecutive', () => {
      result = fields.fieldValidations.email('012345AB678901@cheesey-feet.com')
      expect(result).to.equal('containsTooManyDigits')
    })
  })
})
