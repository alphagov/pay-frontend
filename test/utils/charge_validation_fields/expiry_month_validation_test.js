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

  it('should return true if month and 2-digit year are in future', function () {
    var result = fields.fieldValidations.expiryMonth('10', { expiryYear: '20' })
    expect(result).to.equal(true)
  })

  it('should return true if month and 4-digit year are in future', function () {
    var result = fields.fieldValidations.expiryMonth('10', { expiryYear: '2020' })
    expect(result).to.equal(true)
  })

  it('should return invalidMonth if month is a decimal', function () {
    var result = fields.fieldValidations.expiryMonth('0.1', { expiryYear: '21' })
    expect(result).to.equal('invalidMonth')
  })

  it('should return invalidMonth if month is greater than 12', function () {
    var result = fields.fieldValidations.expiryMonth('13', { expiryYear: '21' })
    expect(result).to.equal('invalidMonth')
  })

  it('should return invalidMonth if month has characters as well as digits', function () {
    var result = fields.fieldValidations.expiryMonth('a12', { expiryYear: '21' })
    expect(result).to.equal('invalidMonth')
  })

  it('should return invalidYear if year is 3 digits', function () {
    var result = fields.fieldValidations.expiryMonth('12', { expiryYear: '021' })
    expect(result).to.equal('invalidYear')
  })

  it('should return inThePast if month in the past', function () {
    var result = fields.fieldValidations.expiryMonth('8', { expiryYear: '20' })
    expect(result).to.equal('inThePast')
  })

  it('should return inThePast if 2-digit year in the past', function () {
    var result = fields.fieldValidations.expiryMonth('12', { expiryYear: '19' })
    expect(result).to.equal('inThePast')
  })

  it('should return inThePast if 4-digit year in the past', function () {
    var result = fields.fieldValidations.expiryMonth('12', { expiryYear: '2019' })
    expect(result).to.equal('inThePast')
  })

  it('should return message if year is not defined', function () {
    var result = fields.fieldValidations.expiryMonth('12', {})
    expect(result).to.equal('message')
  })
})
