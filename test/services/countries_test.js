const path = require('path')
const expect = require('chai').expect
const countries = require(path.join(__dirname, '/../../app/services/countries.js'))

describe('countries', function () {
  it('should list of countries ordered', function () {
    let retrievedCountries = countries.retrieveCountries()

    expect(retrievedCountries[0].entry.country).to.eql('AF')
    expect(retrievedCountries[1].entry.country).to.eql('AL')
  })

  it('should translate country code to name', function () {
    expect(countries.translateAlpha2('GB')).to.eql('United Kingdom')
  })
})
