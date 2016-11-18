/*jslint node: true */
"use strict";
var _           = require('lodash');

var q           = require('q');
var changeCase  = require('change-case');
var cardIdClient = require('../utils/cardid_client');
var logger  = require('winston');

var checkCard = function(cardNo,allowed, correlationId) {
  var defer = q.defer();

  var startTime = new Date();
  var data = {"cardNumber": parseInt(cardNo) };

  cardIdClient.post({data: data, correlationId: correlationId}, function(data, response) {
      logger.info(`[${correlationId}]  - %s to %s ended - total time %dms`, 'POST', cardIdClient.CARD_URL, new Date() - startTime);

      if (response.statusCode === 404) {
        return defer.reject("Your card is not supported");
      }
      // if the server is down, or returns non 500, just continue
      if (response.statusCode !== 200) {
        return defer.resolve(); }

      var cardBrand = changeCase.paramCase(data.brand);
      var cardType = normaliseCardType(data.type);

      logger.debug(`[${correlationId}] Checking card brand - `, {'cardBrand': cardBrand, 'cardType': cardType});

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
      logger.error(`[${correlationId}] ERROR CALLING CARD SERVICE`, error);
      logger.info(`[${correlationId}] - %s to %s ended - total time %dms`, 'POST', cardIdClient.cardUrl, new Date() - startTime);
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

module.exports = function(allowedCards, correlationId){
  var withdrawalTypes = [],
  allowed             = _.clone(allowedCards);
  correlationId = correlationId || '';

  if (_.filter(allowedCards,{debit: true}).length !== 0) withdrawalTypes.push('debit');
  if (_.filter(allowedCards,{credit: true}).length !== 0) withdrawalTypes.push('credit');

  return {
    withdrawalTypes: withdrawalTypes,
    allowed: _.clone(allowed),
    checkCard: (cardNo)=> { return checkCard(cardNo, allowed, correlationId); }
  };
};
