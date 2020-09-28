'use strict'

const cardTypes = require('../../test_helpers/test_helpers.js').cardTypes()
const Card = require('../../../app/models/card.js')(cardTypes)
const fields = require('../../../app/utils/charge_validation_fields.js')(Card)
const { expect } = require('chai')
const sinon = require('sinon')
const mockNewDateToAlwaysReturn = (date) => sinon.useFakeTimers({ now: date, toFake: ['Date'] })

describe('Card expiry date validation', function () {
  var clock

  before(() => {
    const september = 9 - 1 // Months are zero-indexed
    clock = mockNewDateToAlwaysReturn(new Date(2020, september, 21))
  });

  after(() => {
    if (clock) {
      clock.restore()
    }
  })

  it('should return true if 2-digit month and 2-digit year are this month', function () {
    var result = fields.fieldValidations.expiryMonth('09', { expiryYear: '20' })
    expect(result).to.equal(true)
  })

  it('should return true if 2-digit month and 4-digit year are this month', function () {
    var result = fields.fieldValidations.expiryMonth('09', { expiryYear: '2020' })
    expect(result).to.equal(true)
  })

  it('should return true if single-digit month and 2-digit year are this month', function () {
    var result = fields.fieldValidations.expiryMonth('9', { expiryYear: '20' })
    expect(result).to.equal(true)
  })

  it('should return true if single-digit month and 4-digit year are this month', function () {
    var result = fields.fieldValidations.expiryMonth('9', { expiryYear: '2020' })
    expect(result).to.equal(true)
  })

  it('should return true if month and 2-digit year are in the future', function () {
    var result = fields.fieldValidations.expiryMonth('10', { expiryYear: '20' })
    expect(result).to.equal(true)
  })

  it('should return true if month and 4-digit year are in the future', function () {
    var result = fields.fieldValidations.expiryMonth('10', { expiryYear: '2020' })
    expect(result).to.equal(true)
  })

  it('should return true if 2-digit month is earlier than now but 2-digit year is in the future', function () {
    var result = fields.fieldValidations.expiryMonth('08', { expiryYear: '21' })
    expect(result).to.equal(true)
  })

  it('should return true if 2-digit month is earlier than now but 4-digit year is in the future', function () {
    var result = fields.fieldValidations.expiryMonth('08', { expiryYear: '2021' })
    expect(result).to.equal(true)
  })

  it('should return true if single-digit month is earlier than now but 2-digit year is in the future', function () {
    var result = fields.fieldValidations.expiryMonth('8', { expiryYear: '21' })
    expect(result).to.equal(true)
  })

  it('should return true if single-digit month is earlier than now but 4-digit year is in the future', function () {
    var result = fields.fieldValidations.expiryMonth('8', { expiryYear: '2021' })
    expect(result).to.equal(true)
  })

  it('should return invalidMonth if month is 3 digits', function () {
    var result = fields.fieldValidations.expiryMonth('123', { expiryYear: '21' })
    expect(result).to.equal('invalidMonth')
  })

  it('should return invalidMonth if month is 3 digits with first digit 0', function () {
    var result = fields.fieldValidations.expiryMonth('012', { expiryYear: '21' })
    expect(result).to.equal('invalidMonth')
  })

  it('should return invalidMonth if month is 0', function () {
    var result = fields.fieldValidations.expiryMonth('0', { expiryYear: '21' })
    expect(result).to.equal('invalidMonth')
  })

  it('should return invalidMonth if month is a decimal', function () {
    var result = fields.fieldValidations.expiryMonth('1.3', { expiryYear: '21' })
    expect(result).to.equal('invalidMonth')
  })

  it('should return invalidMonth if month is negative with single digit', function () {
    var result = fields.fieldValidations.expiryMonth('-1', { expiryYear: '21' })
    expect(result).to.equal('invalidMonth')
  })

  it('should return invalidMonth if month is negative with 2 digits', function () {
    var result = fields.fieldValidations.expiryMonth('-12', { expiryYear: '21' })
    expect(result).to.equal('invalidMonth')
  })

  it('should return invalidMonth if month is greater than 12', function () {
    var result = fields.fieldValidations.expiryMonth('13', { expiryYear: '21' })
    expect(result).to.equal('invalidMonth')
  })

  it('should return invalidMonth if month is greater than 12 but doesn’t begin with 1', function () {
    var result = fields.fieldValidations.expiryMonth('21', { expiryYear: '21' })
    expect(result).to.equal('invalidMonth')
  })

  it('should return invalidMonth if 2-digit month has letters as well as digits', function () {
    var result = fields.fieldValidations.expiryMonth('a2', { expiryYear: '21' })
    expect(result).to.equal('invalidMonth')
  })

  it('should return invalidMonth if 2-digit month has only letters', function () {
    var result = fields.fieldValidations.expiryMonth('ab', { expiryYear: '21' })
    expect(result).to.equal('invalidMonth')
  })

  it('should return invalidMonth if single-digit month has only letters', function () {
    var result = fields.fieldValidations.expiryMonth('a', { expiryYear: '21' })
    expect(result).to.equal('invalidMonth')
  })

  it('should return invalidMonth if 2-digit month has only punctuation', function () {
    var result = fields.fieldValidations.expiryMonth('--', { expiryYear: '21' })
    expect(result).to.equal('invalidMonth')
  })

  it('should return invalidMonth if single-digit month has only punctuation', function () {
    var result = fields.fieldValidations.expiryMonth('-', { expiryYear: '21' })
    expect(result).to.equal('invalidMonth')
  })

  it('should return invalidYear if year is 1 digit', function () {
    var result = fields.fieldValidations.expiryMonth('12', { expiryYear: '9' })
    expect(result).to.equal('invalidYear')
  })

  it('should return invalidYear if year is 3 digits', function () {
    var result = fields.fieldValidations.expiryMonth('12', { expiryYear: '021' })
    expect(result).to.equal('invalidYear')
  })

  it('should return invalidYear if year is 5 digits', function () {
    var result = fields.fieldValidations.expiryMonth('12', { expiryYear: '20201' })
    expect(result).to.equal('invalidYear')
  })

  it('should return invalidYear if year is 5 digits and begins with 0', function () {
    var result = fields.fieldValidations.expiryMonth('12', { expiryYear: '02021' })
    expect(result).to.equal('invalidYear')
  })

  it('should return invalidYear if year is 4 digits and begins with 0', function () {
    var result = fields.fieldValidations.expiryMonth('12', { expiryYear: '0202' })
    expect(result).to.equal('invalidYear')
  })

  it('should return invalidYear if year is a decimal', function () {
    var result = fields.fieldValidations.expiryMonth('12', { expiryYear: '20.2' })
    expect(result).to.equal('invalidYear')
  })

  it('should return invalidYear if year is negative  with single digit', function () {
    var result = fields.fieldValidations.expiryMonth('12', { expiryYear: '-1' })
    expect(result).to.equal('invalidYear')
  })

  it('should return invalidYear if year is negative  with 2 digits', function () {
    var result = fields.fieldValidations.expiryMonth('12', { expiryYear: '-30' })
    expect(result).to.equal('invalidYear')
  })

  it('should return invalidYear if year is negative  with 3 digits', function () {
    var result = fields.fieldValidations.expiryMonth('12', { expiryYear: '-300' })
    expect(result).to.equal('invalidYear')
  })

  it('should return invalidYear if year is negative  with 4 digits', function () {
    var result = fields.fieldValidations.expiryMonth('12', { expiryYear: '-2099' })
    expect(result).to.equal('invalidYear')
  })

  it('should return invalidYear if year is after than 2099', function () {
    var result = fields.fieldValidations.expiryMonth('12', { expiryYear: '2199' })
    expect(result).to.equal('invalidYear')
  })

  it('should return invalidYear if 2-digit has letters as well as digits', function () {
    var result = fields.fieldValidations.expiryMonth('12', { expiryYear: '3a' })
    expect(result).to.equal('invalidYear')
  })

  it('should return invalidYear if 4-digit has letters as well as digits', function () {
    var result = fields.fieldValidations.expiryMonth('12', { expiryYear: '203a' })
    expect(result).to.equal('invalidYear')
  })

  it('should return invalidMonth if 2-digit year has only letters', function () {
    var result = fields.fieldValidations.expiryMonth('12', { expiryYear: 'ab' })
    expect(result).to.equal('invalidYear')
  })

  it('should return invalidMonth if 4-digit year has only letters', function () {
    var result = fields.fieldValidations.expiryMonth('12', { expiryYear: 'abcd' })
    expect(result).to.equal('invalidYear')
  })

  it('should return invalidYear if 2-digit year has only punctuation', function () {
    var result = fields.fieldValidations.expiryMonth('12', { expiryYear: '--' })
    expect(result).to.equal('invalidYear')
  })

  it('should return invalidYear if 4-digit has only punctuation', function () {
    var result = fields.fieldValidations.expiryMonth('12', { expiryYear: '----' })
    expect(result).to.equal('invalidYear')
  })

  it('should return inThePast if single-digit month is in the past this year', function () {
    var result = fields.fieldValidations.expiryMonth('8', { expiryYear: '20' })
    expect(result).to.equal('inThePast')
  })

  it('should return inThePast if two-digit month is in the past this year', function () {
    var result = fields.fieldValidations.expiryMonth('08', { expiryYear: '20' })
    expect(result).to.equal('inThePast')
  })

  it('should return inThePast if 2-digit year is in the past', function () {
    var result = fields.fieldValidations.expiryMonth('12', { expiryYear: '19' })
    expect(result).to.equal('inThePast')
  })

  it('should return inThePast if 4-digit year is in the past', function () {
    var result = fields.fieldValidations.expiryMonth('12', { expiryYear: '2019' })
    expect(result).to.equal('inThePast')
  })

  it('should return inThePast if 2-digit year is in the past and begins with 0', function () {
    var result = fields.fieldValidations.expiryMonth('12', { expiryYear: '09' })
    expect(result).to.equal('inThePast')
  })

  it('should return inThePast if 4-digit year is before 2000', function () {
    var result = fields.fieldValidations.expiryMonth('12', { expiryYear: '1999' })
    expect(result).to.equal('inThePast')
  })

  it('should return message if month is not defined', function () {
    var result = fields.fieldValidations.expiryMonth('', { expiryYear: '21' })
    expect(result).to.equal('message')
  })

  it('should return message if year is not defined', function () {
    var result = fields.fieldValidations.expiryMonth('12', {})
    expect(result).to.equal('message')
  })
})
