/* jslint node: true */
'use strict'

var chargeValidator = require('./charge_validation.js')
var _ = require('lodash')
var normalise = require('../services/normalise_charge.js')

module.exports = function (translations, logger, cardModel) {
  var validator = chargeValidator(
    translations,
    logger,
    cardModel
  )

  var verify = function (req) {

    return new Promise(function(resolve){

      var logger = require('pino')
      var validation = validator.verify(req.body)
      cardModel.checkCard(normalise.creditCard(req.body.cardNo)).then(function (cardBrand) {
        logger.debug('Card supported - ', {'cardBrand': cardBrand})
        resolve({validation: validation, cardBrand: cardBrand})
      }, function (err) {
        logger.error('Card not supported - ', {'err': err})
        addCardnotSupportedError(validation, err)
        resolve({validation: validation})
      })

    })

  }

  var addCardnotSupportedError = function (validation, cardErrors) {
    validation.hasError = true
    _.remove(validation.errorFields, (errorField) => {
      return errorField.cssKey === 'card-no'
    })
    validation.errorFields.unshift({
      'cssKey': 'card-no',
      'key': 'cardNo',
      'value': cardErrors
    })
    validation.highlightErrorFields.cardNo = cardErrors
  }

  return {
    verify: verify
  }
}
