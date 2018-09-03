'use strict'

// npm dependencies
const _ = require('lodash')

// local dependencies
const chargeValidator = require('./charge_validation.js')
const normalise = require('../services/normalise_charge.js')

module.exports = (translations, logger, cardModel) => {
  const validator = chargeValidator(translations, logger, cardModel)
  return {
    verify: (req) => new Promise((resolve) => {
      const validation = validator.verify(req.body)
      cardModel.checkCard(normalise.creditCard(req.body.cardNo), req.chargeData.language)
        .then(cardBrand => {
          logger.debug('Card supported - ', {cardBrand})
          resolve({validation, cardBrand})
        })
        .catch(err => {
          logger.error('Card not supported - ', {'err': err})
          // add card not supported error to validation
          validation.hasError = true
          _.remove(validation.errorFields, errorField => errorField.cssKey === 'card-no')
          validation.errorFields.unshift({
            'cssKey': 'card-no',
            'key': 'cardNo',
            'value': err
          })
          validation.highlightErrorFields.cardNo = err
          resolve({validation})
        })
    })
  }
}
