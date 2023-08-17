const randomString = require('randomstring')
const validationLib = require('../../app/utils/charge-validation-fields')
const cardFactory = require('../../app/models/card.js')
const card = cardFactory()
const fieldValidators = validationLib(card).fieldValidations

const chai = require('chai')
const expect = chai.expect

describe('form validations', function () {
  it('should allow a correctly formatted email', function () {
    expect(fieldValidators.email('bob@bobbington.cbobbjb')).to.equal(true)
    expect(fieldValidators.email('b@bobbington.cbobbjb.dwf')).to.equal(true)
    expect(fieldValidators.email('customer/department=shipping@example.com')).to.equal(true)
  })

  it('should deny an incorrectly formatted email', function () {
    expect(fieldValidators.email('bob@bob')).to.equal('message')
    expect(fieldValidators.email('@bobbington.cbobbjb.dwf')).to.equal('message')
    expect(fieldValidators.email(123)).to.equal('message')
  })

  it('should deny a correctly formated email with the incorrect length', function () {
    expect(fieldValidators.email(randomString.generate(255) + '@bobbington.cbobbjb')).to.equal('invalidLength')
  })
})
