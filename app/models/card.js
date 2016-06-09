/*jslint node: true */
"use strict";
var _ = require('lodash');
var Client  = require('node-rest-client').Client;
var client  = new Client();
var q = require('q');
var changeCase = require('change-case');


var allowed = [
  {
    type: "visa",
    debit: true,
    credit: true
  },
  {
    type: "master-card",
    debit: true,
    credit: true
  },
  {
    type: "american-express",
    debit: false,
    credit: true
  },
  {
    type: "jcb",
    debit: true,
    credit: false
  },
  {
    type: "diners-club",
    debit: true,
    credit: true
  },
  {
    type: "discover",
    debit: true,
    credit: true
  }
];

var checkCard = function(cardNo) {
    var defer = q.defer();
    var CARDID_HOST = process.env.CARDID_HOST;
    client.get(CARDID_HOST + "/v1/api/card/" + cardNo, function(data, response) {
      var card = data;
      if (response.statusCode === "404") {
        return defer.reject("Your card is not supported");
      }

      var normalisedName = changeCase.paramCase(data.label);
      var cardObject = _.find(allowed, ["type",normalisedName]);

      if (!cardObject) return defer.reject(changeCase.titleCase(normalisedName) + " is not supported");

      if (card.type === "D") {
        if (cardObject.debit) defer.resolve();
        return defer.reject(changeCase.titleCase(normalisedName) + " debit cards are not supported");
      }

      if (card.type === "C") {
        if (cardObject.credit) defer.resolve();
        return defer.reject(changeCase.titleCase(normalisedName) + " credit cards are not supported");
      }

      defer.resolve();

    }).on('error',function(){
      defer.resolve();
    });
    return defer.promise;
};



module.exports = function(params){
  var withdrawalTypes = [],
  cards = _.clone(allowed);

  if (params && params.debitOnly) {
    cards = _.map(cards, function(o) { o.credit = false; return o; });
  }

  if (params && params.removeAmex) {
    cards =  _.remove(cards, function(o) { return o.type !== "american-express"; });
  }


  if (_.filter(cards,{debit: true}).length !== 0) withdrawalTypes.push('debit');
  if (_.filter(cards,{credit: true}).length !== 0) withdrawalTypes.push('credit');

  return {
    withdrawalTypes: withdrawalTypes,
    allowed: cards,
    checkCard: checkCard
  };
};
