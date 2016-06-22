/*jslint node: true */
"use strict";
var _           = require('lodash');
var Client      = require('node-rest-client').Client;
var client      = new Client();
var q           = require('q');
var changeCase  = require('change-case');
var paths       = require('../paths.js');
var allowed;
var logger  = require('winston');


var checkCard = function(cardNo) {
    var defer = q.defer();
    var CARDID_HOST = process.env.CARDID_HOST;
    client.post(CARDID_HOST + "/v1/api/card" , {
      data: {"cardNumber": parseInt(cardNo) },
      headers: { "Content-Type": "application/json" }
    }, function(data, response) {
      var card = data;

      if (response.statusCode === 404) {
        return defer.reject("Your card is not supported");
      }
      // if the server is down, or returns non 500, just continue
      if (response.statusCode !== 200) { return defer.resolve(); }

      var computerName = changeCase.paramCase(data.brand);
      var humanName    = changeCase.titleCase(computerName);
      var cardObject   = _.find(allowed, ["brand",computerName]);
      if (!cardObject) return defer.reject(humanName + " is not supported");

      if (card.type === "D") {
        if (cardObject.debit) defer.resolve();
        return defer.reject(humanName + " debit cards are not supported");
      }

      if (card.type === "C") {
        if (cardObject.credit) defer.resolve();
        return defer.reject(humanName + " credit cards are not supported");
      }

      defer.resolve();

    }).on('error',function(error){
      console.log("ERROR CALLING CARD SERVICE", error);
      defer.resolve();
    });
    return defer.promise;
};

var allConnectorCardTypes = function(){
  logger.debug('Calling connector get card types');
  var defer = q.defer();
  client.get(paths.connectorCharge.allCards.path, function(data) {
    defer.resolve(data.card_types);
  }).on('error',function(){
    defer.reject();
  });

  return defer.promise;

};



module.exports = function(allowedCards){
  var withdrawalTypes = [];
  allowed = _.clone(allowedCards);

  if (_.filter(allowedCards,{debit: true}).length !== 0) withdrawalTypes.push('debit');
  if (_.filter(allowedCards,{credit: true}).length !== 0) withdrawalTypes.push('credit');

  return {
    withdrawalTypes: withdrawalTypes,
    allowed: _.clone(allowed),
    checkCard: checkCard,
    allConnectorCardTypes: allConnectorCardTypes
  };
};
