'use strict'

const { stubBuilder } = require('./stub-builder')
const paymentFixtures = require('../../../fixtures/payment.fixtures')

function cardIdValidCardDetails () {
  const path = '/v1/api/card'
  return stubBuilder('POST', path, 200, {
    response: paymentFixtures.validCardDetails()
  })
}

module.exports = { cardIdValidCardDetails }
