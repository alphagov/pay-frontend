/*jslint node: true */
"use strict";

var chargeValidator = require('./charge_validation.js');
var q               = require('q');
var _               = require('lodash');
var normalise       = require('../services/normalise_charge.js');

module.exports = function(translations, logger, cardModel) {
  var validator = chargeValidator(
    translations,
    logger,
    cardModel
  );

  var verify = function(req) {

    var logger = require('winston');
    var defer = q.defer();
    var validation = validator.verify(req.body);
    cardModel.checkCard(normalise.creditCard(req.body.cardNo)).then(function(cardBrand){
      logger.debug("Card supported - ", {'cardBrand': cardBrand});
      defer.resolve({validation: validation, cardBrand: cardBrand});
    },function(err){
      logger.error("Card not supported - ", {'err': err});
      addCardnotSupportedError(validation, err);
      defer.resolve({validation: validation});
    });

    return defer.promise;
  },

  addCardnotSupportedError = function(validation,cardErrors){
    validation.hasError  = true;
    _.remove(validation.errorFields, (errorField) => {
      return errorField.cssKey === "card-no";
    });
    validation.errorFields.unshift({
      "cssKey":"card-no",
      "key":"cardNo",
      "value": cardErrors
    });
    validation.highlightErrorFields.cardNo = cardErrors;
  };

  return {
    verify: verify,
  };

};
