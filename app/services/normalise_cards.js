/*jslint node: true */
"use strict";
var _ = require('lodash');
module.exports = function(apiCards){
  var normalised = _.reduce(apiCards, function(result, value) {
    var entry = _.find(result, function(card) {
      return card.brand === value.brand;
    });

    if (!entry) {
      var normalisedCard = {
        brand: value.brand,
        debit: value.type === "DEBIT",
        credit: value.type === "CREDIT"
      };
      result.push(normalisedCard);
      return result;
    }

    entry[value.type.toLowerCase()] = true;
    return result;
  }, []);

  return  normalised;
};


