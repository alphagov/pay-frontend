var renderTemplate = require(__dirname + '/test_helpers/html_assertions.js').render;
var cheerio = require('cheerio');
var should = require('chai').should();

describe('The charge view', function() {

  it('should render the amount', function () {
    var templateData = {
      'amount' : '50.00'
    };

    var body = renderTemplate('charge', templateData);
    body.should.containSelector('#amount').withText('£50.00');
  });

  it('should have a submit form.', function () {
    var postAction = "/post_card_path";
    var templateData = {
      'post_card_action' : postAction
    };

    var body = renderTemplate('charge', templateData);

    body.should.containSelector('form#card-details').withAttributes(
        {
          action: postAction,
          method: "POST",
          name: "cardDetails"
        });
  });

  it('should have a \'Make payment\' button.', function () {
    var body = renderTemplate('charge', {});
    body.should.containInputWithIdAndName('submit-card-details', 'submitCardDetails', 'submit');
  });

  it('should show all input fields.', function () {
     var body = renderTemplate('charge', {'id' : '1234'});
     body.should.containInputWithIdAndName('csrf', 'csrfToken', 'hidden');
     body.should.containInputWithIdAndName('card-no', 'cardNo', 'text').withAttribute('maxlength', '19').withLabel('card-no-lbl', 'Card number');
     body.should.containInputWithIdAndName('cvc', 'cvc', 'text').withAttribute('maxlength', '3').withLabel('cvc-lbl', 'Card security code');
     body.should.containInputWithIdAndName('expiry-date', 'expiryDate', 'text').withAttribute('maxlength', '5').withLabel('expiry-date-lbl', 'Expiry date');
     body.should.containInputWithIdAndName('cardholder-name', 'cardholderName', 'text').withAttribute('maxlength', '200').withLabel('cardholder-name-lbl', 'Name on card');
     body.should.containInputWithIdAndName('address-line-1', 'addressLine1', 'text').withAttribute('maxlength', '100').withLabel('address-line-1-lbl', 'Building name and/or number and street');
     body.should.containInputWithIdAndName('address-line2', 'addressLine2', 'text').withAttribute('maxlength', '100');
     body.should.containInputWithIdAndName('address-city', 'addressCity', 'text').withAttribute('maxlength', '100').withLabel('address-city-lbl', 'Town or city');
     body.should.containInputWithIdAndName('address-postcode', 'addressPostcode', 'text').withAttribute('maxlength', '10').withLabel('address-postcode-lbl', 'Postcode');
     body.should.containInputWithIdAndName('charge-id', 'chargeId', 'hidden').withAttribute('value', '1234');
  });
});

describe('The confirm view', function () {

  it('should render cardNumber, expiryDate, amount and cardholder details fields', function () {
    var templateData = {
      session: {
        'cardNumber': "************5100",
        'expiryDate': "11/99",
        'cardholderName': 'Francisco Blaya-Gonzalvez',
        'address': '1 street lane, avenue city, AB1 3DF'
      },
      'amount': "10.00",
      'description': "Payment Description & <xss attack> assessment"
    };

    var body = renderTemplate('confirm', templateData);
    var $ = cheerio.load(body);
    $('#payment-description').html().should.equal('Payment Description &amp; &lt;xss attack&gt; assessment');
    body.should.containInputWithIdAndName('csrf', 'csrfToken', 'hidden');
    body.should.containSelector('#card-number').withText('************5100');
    body.should.containSelector('#expiry-date').withText('11/99');
    body.should.containSelector('#amount').withText('£10.00');
    body.should.containSelector('#payment-description').withText('Payment Description');
    body.should.containSelector('#cardholder-name').withText('Francisco Blaya-Gonzalvez');
    body.should.containSelector('#address').withText('1 street lane, avenue city, AB1 3DF');
  });

  it('should render a confirm button', function () {
    var body = renderTemplate('confirm', {confirmPath: '/card_details/123/confirm', 'charge_id': 1234});
    body.should.containSelector('form#confirmation').withAttributes(
        {
          action: '/card_details/123/confirm',
          method: "POST"
        });
    body.should.containSelector('button#confirm').withText("Confirm");
    body.should.containInputField('chargeId', 'hidden').withAttribute('value', '1234');
  });

});
