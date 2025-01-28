'use strict'

const { stubBuilder } = require('./stub-builder')
const paymentFixtures = require('../../../fixtures/payment.fixtures')

function cardIdValidCardDetails (cardNumber) {
  const path = '/v1/api/card'
  return stubBuilder('POST', path, 200, {
    request: {
      cardNumber: cardNumber || 4444333322221111
    },
    response: paymentFixtures.validCardDetails()
  })
}

module.exports = { cardIdValidCardDetails }
