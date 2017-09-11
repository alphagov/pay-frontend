'use strict'
var _ = require('lodash')

var q = require('q')
var changeCase = require('change-case')
var cardIdClient = require('../utils/cardid_client')
var logger = require('winston')

var checkCard = function (cardNo, allowed, correlationId) {
  var defer = q.defer()

  var startTime = new Date()
  var payload = {'cardNumber': parseInt(cardNo)}

  cardIdClient.post({payload: payload, correlationId: correlationId}, function (err, data) {
    logger.info(`[${correlationId}]  - %s to %s ended - total time %dms`, 'POST', cardIdClient.CARD_URL, new Date() - startTime)
    if (err) {
      logger.error(`[${correlationId}] ERROR CALLING CARDID AT ${cardIdClient.CARD_URL}`, err)
      return defer.resolve()
    }

    if (data.statusCode === 404) {
      return defer.reject('Your card is not supported')
    }
      // if the server is down, or returns non 500, just continue
    if (data.statusCode !== 200) {
      return defer.resolve()
    }

    var cardBrand = changeCase.paramCase(data.body.brand)
    var cardType = normaliseCardType(data.body.type)

    logger.debug(`[${correlationId}] Checking card brand - `, {'cardBrand': cardBrand, 'cardType': cardType})

    var brandExists = _.filter(allowed, {brand: cardBrand}).length > 0
    if (!brandExists) defer.reject(changeCase.titleCase(cardBrand) + ' is not supported')

    var cardObject = _.find(allowed, {brand: cardBrand, type: cardType})

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

var normaliseCardType = function (cardType) {
  switch (cardType) {
    case 'D':
      return 'DEBIT'
    case 'C':
      return 'CREDIT'
  }
  return undefined
}

module.exports = function (allowedCards, correlationId) {
  var withdrawalTypes = []
  var allowed = _.clone(allowedCards)
  correlationId = correlationId || ''

  if (_.filter(allowedCards, {debit: true}).length !== 0) withdrawalTypes.push('debit')
  if (_.filter(allowedCards, {credit: true}).length !== 0) withdrawalTypes.push('credit')

  return {
    withdrawalTypes: withdrawalTypes,
    allowed: _.clone(allowed),
    checkCard: (cardNo) => { return checkCard(cardNo, allowed, correlationId) }
  }
}
