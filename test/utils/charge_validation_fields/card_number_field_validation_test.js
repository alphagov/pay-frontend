var expect = require('chai').expect
var cardTypes = require('../../test_helpers/test_helpers.js').cardTypes()
var Card = require('../../../app/models/card.js')(cardTypes)
var fields = require('../../../app/utils/charge_validation_fields.js')(Card)

describe('card validation: card number', function () {
  it('should return true when the card is correct', function () {
    var result = fields.fieldValidations.cardNo('4242424242424242')
    expect(result).to.equal(true)
  })

  it('should strip non numbers', function () {
    var result = fields.fieldValidations.cardNo('42424242424242dsakljl42')
    expect(result).to.equal(true)
  })

  it('should return incorrect length', function () {
    var short = fields.fieldValidations.cardNo('4242')
    var correct = fields.fieldValidations.cardNo('4917610000000000003')

    var long = fields.fieldValidations.cardNo('42424242424242424242')

    expect(short).to.equal('number_incorrect_length')
    expect(correct).to.equal(true)
    expect(long).to.equal('number_incorrect_length')
  })

  it('should return luhn invalid', function () {
    var result = fields.fieldValidations.cardNo('4242424242424241')
    expect(result).to.equal('luhn_invalid')
  })

  it('should return card_not_supported if the card is not supported', function () {
    var result = fields.fieldValidations.cardNo('6759649826438453')
    expect(result).to.equal('card_not_supported')
  })
})
