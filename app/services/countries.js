'use strict'

// Local Dependencies
const countries = require('../../node_modules/govuk-country-and-territory-autocomplete/dist/location-autocomplete-canonical-list.json')

exports.countries = countries
exports.translateCountryISOtoName = countryISO => countries.find(country => country[1].split(':')[1] === countryISO)[0]
