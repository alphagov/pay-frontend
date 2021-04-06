var expect = require('chai').expect
var cardTypes = require('../../test_helpers/test_helpers.js').cardTypes()
var Card = require('../../../app/models/card.js')(cardTypes)
var fields = require('../../../app/utils/charge_validation_fields.js')(Card)
let result

describe('card validation: postcode', function () {
  it('should return true if a valid postcode', function () {
    result = fields.fieldValidations.addressPostcode('N4 2BQ', { addressCountry: 'GB' })
    expect(result).to.equal(true)
  })

  it('should always validate if foreign country - undefined', function () {
    result = fields.fieldValidations.addressPostcode(undefined, { addressCountry: 'FOO' })
    expect(result).to.equal(true)
  })

  it('should always validate if foreign country - bad format', function () {
    result = fields.fieldValidations.addressPostcode('asdf', { addressCountry: 'FOO' })
    expect(result).to.equal(true)
  })

  it('should not validate if not defined', function () {
    result = fields.fieldValidations.addressPostcode(undefined, { addressCountry: 'GB' })
    expect(result).to.equal('message')
  })

  it('should not validate if empty', function () {
    result = fields.fieldValidations.addressPostcode('', { addressCountry: 'GB' })
    expect(result).to.equal('message')
  })

  describe('should not validate if a UK postcode and its length is', () => {
    it('too long', function () {
      result = fields.fieldValidations.addressPostcode('N4 2BQQ', { addressCountry: 'GB' })
      expect(result).to.equal('message')
    })

    it('too short', function () {
      result = fields.fieldValidations.addressPostcode('N4', { addressCountry: 'GB' })
      expect(result).to.equal('message')
    })
  })

  describe('should validate if does not contain 12 digits', () => {
    it('and it contains only text', () => {
      result = fields.fieldValidations.addressPostcode('ABCDEF', { addressCountry: 'US' })
      expect(result).to.equal(true)
    })

    it('and it contains 11 digits', () => {
      result = fields.fieldValidations.addressPostcode('AB01234567890', { addressCountry: 'US' })
      expect(result).to.equal(true)
    })
  })

  describe('should not validate if it contains 12 or more digits', () => {
    it('and it contains only digits', () => {
      result = fields.fieldValidations.addressPostcode('012345678901', { addressCountry: 'US' })
      expect(result).to.equal('containsTooManyDigits')
    })

    it('and it contains both digits and text and the digits are consecutive', () => {
      result = fields.fieldValidations.addressPostcode('ABCDEF0123456789012', { addressCountry: 'US' })
      expect(result).to.equal('containsTooManyDigits')
    })

    it('and it contains both digits and text and the digits are not consecutive', () => {
      result = fields.fieldValidations.addressPostcode('012345AB678901', { addressCountry: 'US' })
      expect(result).to.equal('containsTooManyDigits')
    })
  })
})
