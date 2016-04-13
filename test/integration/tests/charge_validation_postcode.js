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
      .setValue('@addressPostcode', 'N4')
      .click('@expiryYear');
    cardDetails.expect.element('@addressPostcodeLabel')
      .text.to.contain('Please enter a valid postcode').before(300);
    browser.end();
  },
};
