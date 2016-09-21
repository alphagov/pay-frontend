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

  var startTime = new Date();
  var cardUrl = CARDID_HOST + "/v1/api/card";
  client.post(cardUrl , {
      data: {"cardNumber": parseInt(cardNo) },
      headers: { "Content-Type": "application/json" }
    }, function(data, response) {
      logger.info('[] - %s to %s ended - total time %dms', 'POST', cardUrl, new Date() - startTime);

      if (response.statusCode === 404) {
        return defer.reject("Your card is not supported");
      }
      // if the server is down, or returns non 500, just continue
      if (response.statusCode !== 200) { return defer.resolve(); }

      var cardBrand = changeCase.paramCase(data.brand);
      var cardType = normaliseCardType(data.type);

      logger.debug("Checking card brand - ", {'cardBrand': cardBrand, 'cardType': cardType});

      var brandExists = _.filter(allowed, {brand: cardBrand}).length > 0;
      if (!brandExists) defer.reject(changeCase.titleCase(cardBrand) + " is not supported");

      var cardObject = _.find(allowed, {brand: cardBrand, type: cardType});

      if (!cardObject) {
        switch (cardType) {
          case "DEBIT":
            return defer.reject(changeCase.titleCase(cardBrand) + " debit cards are not supported");
          case "CREDIT":
            return defer.reject(changeCase.titleCase(cardBrand) + " credit cards are not supported");
        }
      }
      return defer.resolve(cardBrand);
    }).on('error',function(error){
      logger.error("ERROR CALLING CARD SERVICE", error);
      logger.info('[] - %s to %s ended - total time %dms', 'POST', cardUrl, new Date() - startTime);
      defer.resolve();
    });
    return defer.promise;
};

var normaliseCardType = function(cardType) {
  switch (cardType) {
    case "D":
      return "DEBIT";
    case "C":
      return "CREDIT";
  }
  return undefined;
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
