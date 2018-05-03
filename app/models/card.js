'use strict'

// npm dependencies
const _ = require('lodash')
const q = require('q')
const changeCase = require('change-case')
const logger = require('winston')

// local dependencies
const cardIdClient = require('../utils/cardid_client')

const checkCard = function (cardNo, allowed, correlationId) {
  const defer = q.defer()

  const startTime = new Date()
  const data = {'cardNumber': parseInt(cardNo)}

  cardIdClient.post({data: data, correlationId: correlationId}, function (data, response) {
    logger.info(`[${correlationId}]  - %s to %s ended - total time %dms`, 'POST', cardIdClient.CARD_URL, new Date() - startTime)

    if (response.statusCode === 404) {
      return defer.reject('Your card is not supported')
    }
    // if the server is down, or returns non 500, just continue
    if (response.statusCode !== 200) {
      return defer.resolve()
    }

    const cardBrand = changeCase.paramCase(data.brand)
    const cardType = normaliseCardType(data.type)

    logger.debug(`[${correlationId}] Checking card brand - `, {'cardBrand': cardBrand, 'cardType': cardType})

    const brandExists = _.filter(allowed, {brand: cardBrand}).length > 0
    if (!brandExists) defer.reject(changeCase.titleCase(cardBrand) + ' is not supported')

    const cardObject = _.find(allowed, {brand: cardBrand, type: cardType})

    if (!cardObject) {
      switch (cardType) {
        case 'DEBIT':
          return defer.reject(changeCase.titleCase(cardBrand) + ' debit cards are not supported')
        case 'CREDIT':
          return defer.reject(changeCase.titleCase(cardBrand) + ' credit cards are not supported')
      }
    }
    return defer.resolve(cardBrand)
  }).on('error', function (error) {
    logger.error(`[${correlationId}] ERROR CALLING CARDID AT ${cardIdClient.CARD_URL}`, error)
    logger.info(`[${correlationId}] - %s to %s ended - total time %dms`, 'POST', cardIdClient.cardUrl, new Date() - startTime)
    defer.resolve()
  })
  return defer.promise
}

const normaliseCardType = function (cardType) {
  switch (cardType) {
    case 'D':
      return 'DEBIT'
    case 'C':
      return 'CREDIT'
  }
  return undefined
}

module.exports = function (allowedCards, correlationId) {
  const withdrawalTypes = []
  const allowed = _.clone(allowedCards)
  correlationId = correlationId || ''

  if (_.filter(allowedCards, {debit: true}).length !== 0) withdrawalTypes.push('debit')
  if (_.filter(allowedCards, {credit: true}).length !== 0) withdrawalTypes.push('credit')

  return {
    withdrawalTypes: withdrawalTypes,
    allowed: _.clone(allowed),
    checkCard: (cardNo) => { return checkCard(cardNo, allowed, correlationId) }
  }
}
