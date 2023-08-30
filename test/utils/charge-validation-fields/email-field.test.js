'use strict'

const expect = require('chai').expect
const cardTypes = require('../../test-helpers/test-helpers.js').cardTypes()
const Card = require('../../../app/models/card.js')(cardTypes)
const fields = require('../../../app/utils/charge-validation-fields.js')(Card)

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
})
