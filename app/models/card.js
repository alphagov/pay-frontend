'use strict'

// NPM dependencies
const _ = require('lodash')
const changeCase = require('change-case')
const AWSXRay = require('aws-xray-sdk')
const { getNamespace } = require('continuation-local-storage')
const i18n = require('i18n')

// Local dependencies
const logger = require('../utils/logger')(__filename)
const cardIdClient = require('../services/clients/cardid_client')

// Constants
const clsXrayConfig = require('../../config/xray-cls')
const i18nConfig = require('../../config/i18n')

i18n.configure(i18nConfig)

const checkCard = function (cardNo, allowed, language, correlationId, subSegment) {
  return new Promise(function (resolve, reject) {
    const startTime = new Date()
    const data = { 'cardNumber': parseInt(cardNo) }

    i18n.setLocale(language || 'en')

    // Use a subSegment if passed, otherwise get our main segment
    if (!subSegment) {
      const namespace = getNamespace(clsXrayConfig.nameSpaceName)
      subSegment = namespace.get(clsXrayConfig.segmentKeyName)
    }

    AWSXRay.captureAsyncFunc('cardIdClient_post', function (postSubsegment) {
      if (cardNo.length > 0 && cardNo.length < 11) {
        postSubsegment.close()
        return reject(new Error(i18n.__('fieldErrors.fields.cardNo.numberIncorrectLength')))
      }
      cardIdClient.post({ payload: data, correlationId: correlationId }, postSubsegment)
        .then((response) => {
          postSubsegment.close()
          logger.info(`[${correlationId}]  - %s to %s ended - total time %dms`, 'POST', cardIdClient.CARD_URL, new Date() - startTime)

          if (response.statusCode === 404) {
            return reject(new Error('Your card is not supported'))
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

          logger.debug(`[${correlationId}] Checking card brand - `, {
            'cardBrand': card.brand,
            'cardType': card.type
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

          resolve(card)
        })
        .catch(error => {
          postSubsegment.close(error)
          logger.error(`[${correlationId}] ERROR CALLING CARDID AT ${cardIdClient.CARD_URL}`, error)
          logger.info(`[${correlationId}] - %s to %s ended - total time %dms`, 'POST', cardIdClient.cardUrl, new Date() - startTime)
          resolve()
        })
    }, subSegment)
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

module.exports = function (allowedCards, correlationId) {
  const withdrawalTypes = []
  const allowed = _.clone(allowedCards)
  correlationId = correlationId || ''

  if (_.filter(allowedCards, { debit: true }).length !== 0) withdrawalTypes.push('debit')
  if (_.filter(allowedCards, { credit: true }).length !== 0) withdrawalTypes.push('credit')

  return {
    withdrawalTypes: withdrawalTypes,
    allowed: _.clone(allowed),
    checkCard: (cardNo, language, subSegment) => {
      return checkCard(cardNo, allowed, language, correlationId, subSegment)
    }
  }
}
