'use strict'

// Local Dependencies
const countries = require('../data/countries.json')

exports.countries = countries
exports.translateCountryISOtoName = countryISO => countries.find(country => country[1].split(':')[1] === countryISO)[0]
