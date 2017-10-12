#! /usr/bin/env node
const _ = require('lodash')
const fs = require('fs');
const cheerio = require('cheerio')
const $ = cheerio.load(fs.readFileSync('./bin/countries_wp.html'));

let countryName1
let countryName2
let code1
let code2
let worldpayCountries = new Map()

$('tr.TableStyle-StandardTable-Body-Normal').each(function () {

  countryName1 = null;
  countryName2 = null;
  code1 = null;
  code2 = null;

  $(this).find('td').each(function (index, row) {
    if (countryName1 === null) {
      countryName1 = $(row).text();
    } else if (code1 === null) {
      code1 = $(row).text();
    } else if (countryName2 === null) {
      countryName2 = $(row).text();
    } else if (code2 === null) {
      code2 = $(row).text();
      worldpayCountries.set(code1,countryName1)
      worldpayCountries.set(code2,countryName2)
    }
  })
});
let ourCountriesMap = _.keyBy(JSON.parse(fs.readFileSync('./app/data/countries.json', 'utf8')), 'entry.country');

console.log ('----------------------------------------------------')
console.log('Worldpay number of countries defined:', worldpayCountries.size)
console.log('Gov.Uk Pay number of countries defined:',  _.size(ourCountriesMap))
console.log ('----------------------------------------------------')

let govUkPayMissingCountries = new Map()
let worldPayMissingCountries = new Map()

worldpayCountries.forEach(function(value, key){
 if(!ourCountriesMap[key]) {
  govUkPayMissingCountries.set(key, value)
 }
})

_.forEach(ourCountriesMap, countryEntry => {
  if(!worldpayCountries.get(countryEntry.entry.country)){
    worldPayMissingCountries.set(countryEntry.entry.country, countryEntry.entry.name)
  }
});

console.log('\n Missing Worldpay countries in Gov.Uk Pay:\n', govUkPayMissingCountries)
console.log ('----------------------------------------------------')

console.log('\n Missing Gov.Uk Pay countries in Worldpay:\n', worldPayMissingCountries)
console.log ('----------------------------------------------------')



