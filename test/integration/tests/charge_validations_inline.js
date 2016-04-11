module.exports = {
  '@tags': ['chargeValidation', 'chargeValidationInline'],
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
      .setValue('@cardNo', '12')
      .click('@expiryYear');
    browser.execute(function(){ $("#card-no").blur();});

    cardDetails.expect.element('@cardNoLabel').text.to.contain('your Card number is not of the correct length').before(300);

    browser.end();
  },

  'label gets replaced back to valid after invalid': function (browser) {
    var cardDetails = browser.page.payment_new();
    cardDetails
      .setValue('@cardNo', '12')
      .click('@expiryYear');
    cardDetails.expect.element('@cardNoLabel').text.to.contain('your Card number is not of the correct length').before(300);

    cardDetails
      .setValue('@cardNo', '4242424242424242')
      .click('@expiryYear');
    cardDetails.expect.element('@cardNoLabel').text.to.contain('Card number').before(300);

    browser.end();
  },

  'Label does not get replaced if the focused element is in the same form group': function (browser) {
    var cardDetails = browser.page.payment_new();
    cardDetails
      .setValue('@expiryMonth', '13')
      .click('@expiryYear');
    cardDetails.expect.element('@expiryLabel').text.to.contain('Expiry Date').before(300);
    browser.end();
  },

  'Label gets replaced if the focused element is outside the same form group': function (browser) {
    var cardDetails = browser.page.payment_new();
    cardDetails
      .setValue('@expiryMonth', '13')
      .setValue('@expiryYear', '13')
      .click('@cardNo');
    cardDetails.expect.element('@expiryLabel').text.to.contain('Expiry is not a valid date').before(300);
    browser.end();
  }

};
