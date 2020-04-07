'use strict'

// NPM dependencies
const _ = require('lodash')
const changeCase = require('change-case')
const i18n = require('i18n')

// Local dependencies
const logger = require('../utils/logger')(__filename)
const cardIdClient = require('../services/clients/cardid_client')

// Constants
const i18nConfig = require('../../config/i18n')

i18n.configure(i18nConfig)

const checkCard = function (cardNo, allowed, blockPrepaidCards, language, correlationId, loggingFields = {}) {
  return new Promise(function (resolve, reject) {
    const startTime = new Date()
    const data = { cardNumber: parseInt(cardNo) }

    i18n.setLocale(language || 'en')

    if (cardNo.length > 0 && cardNo.length < 11) {
      return reject(new Error(i18n.__('fieldErrors.fields.cardNo.numberIncorrectLength')))
    }
    cardIdClient.post({ payload: data, correlationId: correlationId })
      .then((response) => {
        logger.info('POST to %s ended - total time %dms', cardIdClient.CARD_URL, new Date() - startTime, loggingFields)

        if (response.statusCode === 404) {
          return reject(new Error('Your card is not supported'))
        }
        if (response.statusCode === 422) {
          return reject(new Error(i18n.__('fieldErrors.fields.cardNo.message')))
        }
        // if the server is down, or returns non 500, just continue
        if (response.statusCode !== 200) {
          return resolve()
        }

        const body = response.body

        const card = {
          brand: changeCase.paramCase(body.brand),
          type: normaliseCardType(body.type),
          corporate: body.corporate,
          prepaid: body.prepaid
        }

        logger.debug('Checking card brand', {
          ...loggingFields,
          card_brand: card.brand,
          card_type: card.type
        })

        if (_.filter(allowed, { brand: card.brand }).length === 0) {
          reject(new Error(i18n.__('fieldErrors.fields.cardNo.unsupportedBrand', changeCase.titleCase(card.brand))))
        }

        if (!_.find(allowed, { brand: card.brand, type: card.type })) {
          switch (card.type) {
            case 'DEBIT':
              return reject(new Error(i18n.__('fieldErrors.fields.cardNo.unsupportedDebitCard', changeCase.titleCase(card.brand))))
            case 'CREDIT':
              return reject(new Error(i18n.__('fieldErrors.fields.cardNo.unsupportedCreditCard', changeCase.titleCase(card.brand))))
          }
        }

        if (blockPrepaidCards && card.prepaid === 'PREPAID') {
          logger.info('Card validation blocked prepaid card', { card_brand: card.brand, card_type: card.type, corporate: card.corporate, x_request_id: correlationId })
          return reject(new Error(i18n.__('fieldErrors.fields.cardNo.unsupportedPrepaidCard', changeCase.titleCase(card.brand))))
        }

        resolve(card)
      })
      .catch(error => {
        logger.error('Error calling card id to check card', {
          ...loggingFields,
          error
        })
        logger.info('POST to %s ended - total time %dms', cardIdClient.cardUrl, new Date() - startTime, loggingFields)
        resolve()
      })
  })
}

const normaliseCardType = function (cardType) {
  switch (cardType) {
    case 'D':
      return 'DEBIT'
    case 'C':
      return 'CREDIT'
    case 'CD':
      return 'CREDIT_OR_DEBIT'
  }
  return undefined
}

module.exports = function (allowedCards, blockPrepaidCards, correlationId) {
  const withdrawalTypes = []
  const allowed = _.clone(allowedCards)
  correlationId = correlationId || ''

  if (_.filter(allowedCards, { debit: true }).length !== 0) withdrawalTypes.push('debit')
  if (_.filter(allowedCards, { credit: true }).length !== 0) withdrawalTypes.push('credit')

  return {
    withdrawalTypes: withdrawalTypes,
    allowed: _.clone(allowed),
    checkCard: (cardNo, language, loggingFields = {}) => {
      return checkCard(cardNo, allowed, blockPrepaidCards, language, correlationId, loggingFields)
    }
  }
}
