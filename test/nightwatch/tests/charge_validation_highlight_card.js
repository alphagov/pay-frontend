module.exports = {
  'tags': ['chargeValidation', 'chargeValidationSelectCard'],
  beforeEach: function (browser) {
    var demoService = browser.page.demo_service()
    demoService.navigate().generateCharge({
      token: process.env.demo_token,
      description: 'hello',
      amount: 1234,
      reference: 'hi'
    })
  },

  'visa gets selected when that is available': function (browser) {
    var cardDetails = browser.page.payment_new()
    cardDetails
      .setValue('@cardNo', '4')

    cardDetails.expect.element('@visaLabel')
      .to.have.attribute('class').which.contains('selected')
    browser.end()
  },

  'visa gets deselected when the number changes': function (browser) {
    var cardDetails = browser.page.payment_new()
    cardDetails
      .setValue('@cardNo', '4')

    cardDetails.expect.element('@visaLabel')
      .to.have.attribute('class').which.contains('selected')

    cardDetails.setValue('@cardNo', [browser.Keys.BACK_SPACE, browser.Keys.BACK_SPACE])

    cardDetails.expect.element('@highlightedCardLabel').to.not.be.present // eslint-disable-line 
    browser.end()
  }

}
