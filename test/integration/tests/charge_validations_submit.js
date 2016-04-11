module.exports = {
  beforeEach: function(browser){
    var demoService = browser.page.demo_service();
    demoService.navigate().generateCharge({
      token: '21584d6a-673e-449f-a6cb-ef4776d6b12e',
      description: "hello",
      amount: 1234,
      reference: "hi"
    });
  },
  'shows errors and highlightbox': function (browser) {
    var cardDetails = browser.page.payment_new();
    cardDetails
      .setValue('@cardNo', '12')
      .submitForm('@form')
      .expect.element('@error-summary').to.be.visible;


      // .click('@cvc')
      // .expect.element('@cardNoLabel').text.to.contain('your Card number is not of the correct length').before(150);

    browser.end();
  }

};
