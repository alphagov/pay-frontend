hashOutCardNumber = require(__dirname + '/../app/utils/charge_utils.js').hashOutCardNumber;
var chai = require('chai');
chai.use(require('chai-string'));
var should = chai.should();

describe('Card number masking', function() {
  var cardNumbers_12_to_19 = [
   '12345678AAAA',
   '123456789AAAA',
   '1234567890AAAA',
   '12345678901AAAA',
   '123456789012AAAA',
   '1234567890123AAAA',
   '12345678901234AAAA',
   '123456789012345AAAA'
  ];

  it('should only show last 4 digits, regardless of card number length.', function () {
    cardNumbers_12_to_19.forEach(function (key) {
      var hashedNumber = hashOutCardNumber(key);
      hashedNumber.should.endWith('AAAA');
      var expectedStarCount = hashedNumber.length - 4;
      hashedNumber.should.have.entriesCount('*', expectedStarCount);
    });
  });
});