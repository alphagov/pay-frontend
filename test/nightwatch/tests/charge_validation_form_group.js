module.exports = {
  '@tags': ['chargeValidation', 'chargeValidationFormGroup'],
  beforeEach: function (browser) {
    var demoService = browser.page.demo_service()
    demoService.navigate().generateCharge({
      token: process.env.demo_token,
      description: 'hello',
      amount: 1234,
      reference: 'hi'
    })
  },

  'Does Not trigger validation when not on last of group': function (browser) {
    var cardDetails = browser.page.payment_new()
    cardDetails
      .setValue('@expiryMonth', ['11', browser.keys.TAB])
    cardDetails.expect.element('@expiryLabel').text.to.contain('Expiry Date').before(100)
    browser.end()
  },

  'label gets replaced when validation fails and you tab past the form group': function (browser) {
    var cardDetails = browser.page.payment_new()
    cardDetails
      .setValue('@expiryMonth', ['11', browser.keys.TAB, browser.keys.TAB])
      .click('@addressLine1')
    cardDetails.expect.element('@expiryLabel').text.to.contain('Enter a valid expiry date').before(100)
    browser.end()
  },

  'error label gets replaced when in error state and you fix it without leaving the form group': function (browser) {
    var cardDetails = browser.page.payment_new()
    cardDetails
      .setValue('@expiryYear', '21')
      .click('@addressLine1')
    cardDetails.expect.element('@expiryLabel').text.to.contain('Enter a valid expiry date').before(100)
    cardDetails
      .setValue('@expiryMonth', ['11', browser.Keys.TAB])
    cardDetails.expect.element('@expiryLabel').text.to.contain('Expiry Date').before(100)
    browser.end()
  }

}
