var expect = require('chai').expect
var cardTypes = require('../../test_helpers/test_helpers.js').cardTypes()
var Card = require('../../../app/models/card.js')(cardTypes)
var fields = require('../../../app/utils/charge_validation_fields.js')(Card)

describe('card validation: expiry month', function () {
  it('should true if correct', function () {
    var future = new Date()
    future.setDate(future.getDate() + 30)
    var fullYear = future.getFullYear().toString()

    var result = fields.fieldValidations.expiryMonth(12, {expiryYear: fullYear.substr(2, 2)})
    var longYear = fields.fieldValidations.expiryMonth(12, {expiryYear: fullYear})

    expect(result).to.equal(true)
    expect(longYear).to.equal(true)
  })

  it('should fails if month is too large or small', function () {
    var small = fields.fieldValidations.expiryMonth(0.1, {expiryYear: 16})
    var large = fields.fieldValidations.expiryMonth(13, {expiryYear: 16})
    var chars = fields.fieldValidations.expiryMonth('a12', {expiryYear: 16})

    expect(small).to.equal('invalidMonth')
    expect(large).to.equal('invalidMonth')
    expect(chars).to.equal('invalidMonth')
  })

  it('should fails if year is not 2 or 4 digits', function () {
    var future = new Date()
    future.setDate(future.getDate() + 30)
    var fullYear = future.getFullYear().toString()

    var two = fields.fieldValidations.expiryMonth(12, {expiryYear: fullYear.substr(2, 2)})
    var three = fields.fieldValidations.expiryMonth(12, {expiryYear: '016'})
    var four = fields.fieldValidations.expiryMonth(12, {expiryYear: fullYear})

    expect(two).to.equal(true)
    expect(three).to.equal('invalidYear')
    expect(four).to.equal(true)
  })

  it('should fail is date is in past', function () {
    var month = fields.fieldValidations.expiryMonth(1, {expiryYear: 16})
    var year = fields.fieldValidations.expiryMonth(1, {expiryYear: 15})
    var longYear = fields.fieldValidations.expiryMonth(1, {expiryYear: '2015'})

    expect(month).to.equal('inThePast')
    expect(year).to.equal('inThePast')
    expect(longYear).to.equal('inThePast')
  })

  it('should fail year is not defined', function () {
    var noYear = fields.fieldValidations.expiryMonth('12', {})

    expect(noYear).to.equal('message')
  })
})
