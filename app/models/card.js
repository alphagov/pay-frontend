/* jslint node: true */
'use strict'
var _ = require('lodash')

var changeCase = require('change-case')
var cardIdClient = require('../utils/cardid_client')
var logger = require('pino')()

var checkCard = function (cardNo, allowed, correlationId) {
  return new Promise(function (resolve, reject) {
    var startTime = new Date()
    var data = {'cardNumber': parseInt(cardNo)}

    cardIdClient.post({data: data, correlationId: correlationId}, function (data, response) {
      logger.info(`[${correlationId}]  - %s to %s ended - total time %dms`, 'POST', cardIdClient.CARD_URL, new Date() - startTime)

      if (response.statusCode === 404) {
        return reject(new Error('Your card is not supported').message)
      }
      // if the server is down, or returns non 500, just continue
      if (response.statusCode !== 200) {
        return resolve()
      }

      var cardBrand = changeCase.paramCase(data.brand)
      var cardType = normaliseCardType(data.type)

      logger.debug(`[${correlationId}] Checking card brand - `, {'cardBrand': cardBrand, 'cardType': cardType})

      var brandExists = _.filter(allowed, {brand: cardBrand}).length > 0
      if (!brandExists) reject(new Error(changeCase.titleCase(cardBrand) + ' is not supported').message)

      var cardObject = _.find(allowed, {brand: cardBrand, type: cardType})

      if (!cardObject) {
        switch (cardType) {
          case 'DEBIT':
            return reject(new Error(changeCase.titleCase(cardBrand) + ' debit cards are not supported').message)
          case 'CREDIT':
            return reject(new Error(changeCase.titleCase(cardBrand) + ' credit cards are not supported').message)
        }
      }
      return resolve(cardBrand)
    }).on('error', function (error) {
      logger.error(`[${correlationId}] ERROR CALLING CARDID AT ${cardIdClient.CARD_URL}`, error)
      logger.info(`[${correlationId}] - %s to %s ended - total time %dms`, 'POST', cardIdClient.cardUrl, new Date() - startTime)
      resolve()
    })
  })
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
