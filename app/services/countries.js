'use strict'
var fs = require('fs')
var _ = require('lodash')
var path = require('path')

var countries = {}

countries = JSON.parse(fs.readFileSync(path.join(__dirname, '/../data/countries.json'), 'utf8'))
// Load additional country data from JSON file
var extensions = JSON.parse(fs.readFileSync(path.join(__dirname, '/../data/country-record-extension.json'), 'utf8'))

// Merge the additional data into the register data
_.each(countries, function (countryList, i) {
  var country = countries[i].entry
  if (country.country === 'GB') country.selected = true

    // delete east germany etc
  if (country['end-date']) {
    delete countries[i]
    return
  }

  for (var j = 0; j < extensions.length; j++) {
    if (country.country === extensions[j].country) {
      country.aliases = extensions[j].aliases
      country.weighting = extensions[j].weighting
    }
  }
})

countries = _.compact(countries)
countries = _.sortBy(countries, function (country) {
  country.entry.name.toLowerCase()
}).reverse()

var retrieveCountries = function () {
  return _.clone(countries)
}

var translateAlpha2 = function (alhpa2Code) {
  var country = _.filter(countries, function (country) {
    return country.entry.country === alhpa2Code
  })[0]
  return country.entry.name
}

module.exports =
{
  retrieveCountries: retrieveCountries,
  translateAlpha2: translateAlpha2
}
