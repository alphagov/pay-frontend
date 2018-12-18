'use strict'

// NPM dependencies
const lodash = require('lodash')
const cheerio = require('cheerio')
const { should } = require('chai')

// Local dependencies
const { render } = require('../test_helpers/html_assertions')

describe('The charge view', () => {
  it('should render the amount', () => {
    const templateData = {
      'allowWebPayments': true,
      'isDevelopment': true,
      'amount': '50.00'
    }
    const body = render('charge', templateData)
    console.log(body)
    body.should.containSelector('#payment-method-payment-request-apple').withText('Apple Pay')
  })
})
