var path = require('path')
var hashOutCardNumber = require(path.join(__dirname, '/../app/utils/charge_utils.js')).hashOutCardNumber
var chai = require('chai')
chai.use(require('chai-string'))
var should = chai.should() // eslint-disable-line

describe('Card number masking', function () {
  var cardNumbers12To19 = [
    '12345678AAAA',
    '123456789AAAA',
    '1234567890AAAA',
    '12345678901AAAA',
    '123456789012AAAA',
    '1234567890123AAAA',
    '12345678901234AAAA',
    '123456789012345AAAA'
  ]

  cardNumbers12To19.forEach(function (key) {
    it('should only show last 4 digits, regardless of card number length. key=' + key, function () {
      var hashedNumber = hashOutCardNumber(key)
      hashedNumber.should.endWith('AAAA')
      var expectedStarCount = hashedNumber.length - 4
      hashedNumber.should.have.entriesCount('*', expectedStarCount)
    })
  })
})
