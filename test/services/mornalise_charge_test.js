var path = require('path')
var expect = require('chai').expect
var normalise = require(path.join(__dirname, '/../../app/services/normalise_charge.js'))

describe('normalise', function () {
  it('expiry date should return correctly on multiple formats', function () {
    expect(normalise.expiryDate('1', '17')).to.eql('01/17')
    expect(normalise.expiryDate('01', '17')).to.eql('01/17')
    expect(normalise.expiryDate('01', '2017')).to.eql('01/17')
  })
})
