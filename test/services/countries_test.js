const expect = require('chai').expect
const {countries, translateCountryISOtoName} = require('../../app/services/countries.js')

describe('countries', function () {
  it('should list of countries ordered', function () {
    expect(countries[0][0]).to.eql('Abu Dhabi')
    expect(countries[1][0]).to.eql('Afghanistan')
  })

  it('should translate country code to name', function () {
    expect(translateCountryISOtoName('GB')).to.eql('United Kingdom')
  })
})
