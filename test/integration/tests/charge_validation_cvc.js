module.exports = {
  '@tags': ['chargeValidation', 'chargeValidationCvc'],
  beforeEach: function(browser){
    var demoService = browser.page.demo_service();
    demoService.navigate().generateCharge({
      token: process.env.demo_token,
      description: "hello",
      amount: 1234,
      reference: "hi"
    });
  },


  'label gets replaced on invalid': function (browser) {
    var cardDetails = browser.page.payment_new();
    cardDetails
      .setValue('@cvc', '12')
      .click('@expiryYear');
    cardDetails.expect.element('@cvcLabel').text.to.contain('Enter a valid card security code').before(300);
    browser.end();
  },
};
