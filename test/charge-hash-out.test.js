const hashOutCardNumber = require('../app/utils/charge-utils').hashOutCardNumber
const chai = require('chai')
chai.use(require('chai-string'))
var should = chai.should() // eslint-disable-line

describe('Card number masking', function () {
  const cardNumbers12To19 = [
    '12345678AAAA',
    '123456789AAAA', // pragma: allowlist secret
    '1234567890AAAA', // pragma: allowlist secret
    '12345678901AAAA', // pragma: allowlist secret
    '123456789012AAAA', // pragma: allowlist secret
    '1234567890123AAAA', // pragma: allowlist secret
    '12345678901234AAAA', // pragma: allowlist secret
    '123456789012345AAAA' // pragma: allowlist secret
  ]

  cardNumbers12To19.forEach(function (key) {
    it('should only show last 4 digits, regardless of card number length. key=' + key, function () {
      const hashedNumber = hashOutCardNumber(key)
      hashedNumber.should.endWith('AAAA')
      const expectedStarCount = hashedNumber.length - 4
      hashedNumber.should.have.entriesCount('*', expectedStarCount)
    })
  })
})
