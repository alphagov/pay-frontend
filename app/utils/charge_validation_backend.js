'use strict'

// NPM dependencies
const _ = require('lodash')

// Local dependencies
const chargeValidator = require('./charge_validation.js')
const normalise = require('../services/normalise_charge.js')

module.exports = (translations, logger, cardModel, chargeOptions) => {
  const validator = chargeValidator(translations, logger, cardModel, chargeOptions)
  return {
    verify: (req) => new Promise((resolve) => {
      const validation = validator.verify(req.body)
      cardModel.checkCard(normalise.creditCard(req.body.cardNo), req.chargeData.language)
        .then(card => {
          logger.debug('Card supported - ', {
            cardBrand: card.brand,
            cardType: card.type,
            cardCorporate: card.corporate,
            prepaid: card.prepaid
          })
          resolve({validation, card})
        })
        .catch(err => {
          logger.error('Card not supported - ', {'err': err.message})
          // add card not supported error to validation
          validation.hasError = true
          _.remove(validation.errorFields, errorField => errorField.cssKey === 'card-no')
          validation.errorFields.unshift({
            'cssKey': 'card-no',
            'key': 'cardNo',
            'value': err.message
          })
          validation.highlightErrorFields.cardNo = err.message
          resolve({validation})
        })
    })
  }
}
