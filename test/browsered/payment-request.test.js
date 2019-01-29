'use strict'

// NPM dependencies
const cheerio = require('cheerio')

// Local dependencies
const { render } = require('../test_helpers/html_assertions')

// TODO This test is totally flawed it’s a placeholder until we do some actual tests
describe('The charge view', () => {
  it('should render apple pay button', () => {
    const templateData = {
      'allowWebPayments': true,
      'isDevelopment': true,
      'amount': '50.00'
    }
    const body = render('charge', templateData)
    const $ = cheerio.load(body)
    $('label[for="payment-method-apple-pay"]').text().should.contain('Apple Pay')
  })
})
