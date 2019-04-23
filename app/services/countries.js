'use strict'

// Local Dependencies
const countries = require('../data/countries.json')

const DEFAULT_COUNTRY_CODE = 'GB'

exports.countries = countries
exports.translateCountryISOtoName = countryISO => {
  const country = countries.find(country => country[1].split(':')[1] === countryISO)
  if (country !== undefined) {
    return country[0]
  } else {
    return countries.find(country => country[1].split(':')[1] === DEFAULT_COUNTRY_CODE)[0]
  }
}

exports.checkOrDefaultCountryCode = countryISO => {
  if (!countryISO) {
    return DEFAULT_COUNTRY_CODE
  }
  const country = countries.find(country => country[1].split(':')[1] === countryISO)
  if (country !== undefined) {
    return countryISO
  }
  return DEFAULT_COUNTRY_CODE
}
