var chargeValidator = require('./charge_validation.js');
var q = require('q');

module.exports = function(translations, logger, cardModel) {
  'use strict';
  var validator = chargeValidator(
    translations,
    logger,
    cardModel
  );

  var verify = function(req) {
    //  this should be replaced with the ajax call for checking out the cards
    // PP-682

    var defer = q.defer();
    setTimeout(function(){
      var validation = validator.verify(req.body);
      var isMockJcb = req.body.cardNo === "3528000700000000";

      if (validation.hasError) defer.resolve(validation);

      if (isMockJcb) addCardnotSupportedError(validation);
      defer.resolve(validation);
    },50);
    return defer.promise;
  },

  addCardnotSupportedError = function(validation){
    var validationString = "jcb credit cards are not supported";
    validation.hasError  = true;
    validation.errorFields.unshift({
      "cssKey":"card-no",
      "key":"cardNo",
      "value": validationString
    });
    validation.highlightErrorFields.cardNo = validationString;
  };

  return {
    verify: verify,
  };

};
