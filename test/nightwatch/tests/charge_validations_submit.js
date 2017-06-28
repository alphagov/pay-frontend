module.exports = {
  '@tags': ['chargeValidation', 'chargeValidationSubmit'],
  beforeEach: function(browser){
    var demoService = browser.page.demo_service();
    demoService.navigate().generateCharge({
      token: process.env.demo_token,
      description: "hello",
      amount: 1234,
      reference: "hi"
    });
  },
  'shows errors and highlightbox and lets submit on correct details': function (browser) {
    var cardDetails = browser.page.payment_new();
    cardDetails
      .setValue('@cardNo', '12')
      .submitForm('@form');

    cardDetails.expect.element('@cardNoLabel').text.to.contain('Card number is not the correct length');
    cardDetails.expect.element('@expiryLabel').text.to.contain('Enter a valid expiry date');
    cardDetails.clearValue("@cardNo");
    cardDetails.EnterValidDetails();
    cardDetails.submitForm('@form');
    browser.assert.title("Confirm your details.");
    browser.end();
  }

};
