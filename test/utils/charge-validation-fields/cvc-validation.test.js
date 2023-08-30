const expect = require('chai').expect
const cardTypes = require('../../test-helpers/test-helpers.js').cardTypes()
const Card = require('../../../app/models/card.js')(cardTypes)
const fields = require('../../../app/utils/charge-validation-fields.js')(Card)

describe('card validation: cvc', function () {
  it('should true if correct', function () {
    const result = fields.fieldValidations.cvc('123')
    expect(result).to.equal(true)
  })

  it('should invalid length if too long', function () {
    const result = fields.fieldValidations.cvc('12345')
    expect(result).to.equal('invalidLength')
  })

  it('should invalid length if too short', function () {
    const result = fields.fieldValidations.cvc('12')
    expect(result).to.equal('invalidLength')
  })

  it('should invalid length if undefined', function () {
    const result = fields.fieldValidations.cvc(undefined)
    expect(result).to.equal('invalidLength')
  })

  it('should invalid length if empty', function () {
    const result = fields.fieldValidations.cvc('')
    expect(result).to.equal('invalidLength')
  })
})
