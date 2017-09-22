'use strict'

// NPM Dependencies
const lodash = require('lodash')

// Local Dependencies
let countries = require('../data/countries.json')
const extensions = require('../data/country-record-extension.json')

// Exports
exports.retrieveCountries = () => lodash.clone(countries)
exports.translateAlpha2 = alpha2Code => countries.find(country => country.entry.country === alpha2Code).entry.name

// Merge the additional data into the register data
countries.forEach((country, i) => {
  const extension = extensions.find(item => item.country === item.country)
  country.entry.selected = country.entry.country === 'GB'
  if (extension) {
    country.entry.aliases = extension.aliases
    country.entry.weighting = extension.weighting
  }
  if (country.entry['end-date']) delete countries[i] // delete east germany etc
})

countries = lodash.compact(countries)
countries = lodash.sortBy(countries, country => country.entry.name.toLowerCase()).reverse()
