/*jslint node: true */
"use strict";
var fs = require('fs');
var _ = require('lodash');

var data = {};

data.countries = JSON.parse(fs.readFileSync(__dirname + '/../data/countries.json', 'utf8'));
// Load additional country data from JSON file
var extensions = JSON.parse(fs.readFileSync(__dirname + '/../data/country-record-extension.json', 'utf8'));


// Merge the additional data into the register data
_.each(data.countries,function(countryList, i){
    var country = data.countries[i].entry;
    if (country.country === "GB") country.selected = true;

    //delete east germany etc
    if (country["end-date"]) {
        delete data.countries[i];
        return;
    }

    for (var j = 0; j < extensions.length; j++) {
        if (country.country === extensions[j].country) {
            country.aliases = extensions[j].aliases;
            country.weighting = extensions[j].weighting;
        }
    }
});


data.countries  = _.compact(data.countries);
data.countries  = _.sortBy(data.countries,function(country){
    country.entry.name.toLowerCase();
}).reverse();

module.exports = function () {
    return _.clone(data);
};