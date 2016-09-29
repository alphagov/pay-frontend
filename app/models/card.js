/*jslint node: true */
"use strict";
var _           = require('lodash');
var Client      = require('node-rest-client').Client;
var client      = new Client();
var q           = require('q');
var changeCase  = require('change-case');
var logger  = require('winston');
var withCorrelationHeader = require('../utils/correlation_header.js').withCorrelationHeader;

var checkCard = function(cardNo,allowed, correlationId) {
  var defer = q.defer();
  var CARDID_HOST = process.env.CARDID_HOST;

  var startTime = new Date();
  var cardUrl = CARDID_HOST + "/v1/api/card";
  var clientArgs = {
    data: {"cardNumber": parseInt(cardNo) },
    headers: { "Content-Type": "application/json" }
  };

  client.post(cardUrl ,withCorrelationHeader(clientArgs, correlationId), function(data, response) {
      logger.info(`[${correlationId}]  - %s to %s ended - total time %dms`, 'POST', cardUrl, new Date() - startTime);

      if (response.statusCode === 404) {
        return defer.reject("Your card is not supported");
      }
      // if the server is down, or returns non 500, just continue
      if (response.statusCode !== 200) { return defer.resolve(); }

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
      logger.info(`[${correlationId}] - %s to %s ended - total time %dms`, 'POST', cardUrl, new Date() - startTime);
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
