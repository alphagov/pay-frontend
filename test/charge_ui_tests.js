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

  it('should have a \'Continue\' button.', function () {
    var body = renderTemplate('charge', {});
    body.should.containInputWithIdAndName('submit-card-details', 'submitCardDetails', 'submit');
  });

  it('should show all input fields.', function () {
     var body = renderTemplate('charge', {'id' : '1234'});
     body.should.containInputWithIdAndName('csrf', 'csrfToken', 'hidden');
     body.should.containInputWithIdAndName('card-no', 'cardNo', 'tel').withAttribute('maxlength', '26').withLabel('card-no-lbl', 'Card number');
     body.should.containInputWithIdAndName('cvc', 'cvc', 'number').withLabel('cvc-lbl', 'Card security code');
     body.should.containInputWithIdAndName('expiry-month', 'expiryMonth', 'number');
     body.should.containInputWithIdAndName('expiry-year', 'expiryYear', 'number');
     body.should.containInputWithIdAndName('cardholder-name', 'cardholderName', 'text').withAttribute('maxlength', '200').withLabel('cardholder-name-lbl', 'Name on card');
     body.should.containInputWithIdAndName('address-line-1', 'addressLine1', 'text').withAttribute('maxlength', '100').withLabel('address-line-1-lbl', 'Building name and/or number and street');
     body.should.containInputWithIdAndName('address-line-2', 'addressLine2', 'text').withAttribute('maxlength', '100');
     body.should.containInputWithIdAndName('address-city', 'addressCity', 'text').withAttribute('maxlength', '100').withLabel('address-city-lbl', 'Town or city');
     body.should.containInputWithIdAndName('address-postcode', 'addressPostcode', 'text').withAttribute('maxlength', '10').withLabel('address-postcode-lbl', 'Postcode');
     body.should.containInputWithIdAndName('charge-id', 'chargeId', 'hidden').withAttribute('value', '1234');
  });

  it('should populate form data if reserved in response', function(){
    var responseData = {
      'id' : '1234',
      'cardholderName' : 'J. Vardy',
      'addressLine1' : '1 High Street',
      'addressLine2' : 'blah blah',
      'addressCity' : 'Leicester City',
      'addressPostcode' : 'CT16 1FB'
    };
    var body = renderTemplate('charge', responseData);

    body.should.containInputWithIdAndName('cardholder-name', 'cardholderName', 'text').withAttribute('value', responseData.cardholderName);
    body.should.containInputWithIdAndName('address-line-1', 'addressLine1', 'text').withAttribute('value', responseData.addressLine1);
    body.should.containInputWithIdAndName('address-line-2', 'addressLine2', 'text').withAttribute('value', responseData.addressLine2);
    body.should.containInputWithIdAndName('address-city', 'addressCity', 'text').withAttribute('value', responseData.addressCity);
    body.should.containInputWithIdAndName('address-postcode', 'addressPostcode', 'text').withAttribute('value', responseData.addressPostcode);

  });
});

describe('The confirm view', function () {

  it('should render cardNumber, expiryDate, amount and cardholder details fields', function () {
    var templateData = {
      charge: {
        'confirmationDetails': {
          'cardNumber': "************5100",
          'expiryDate': "11/99",
          'cardholderName': 'Francisco Blaya-Gonzalvez',
          'billingAddress': '1 street lane, avenue city, AB1 3DF'
        },
        'amount': "10.00",
        'description': "Payment Description & <xss attack> assessment"
      }
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
    var body = renderTemplate('confirm', {confirmPath: '/card_details/123/confirm', 'charge': { id: 1234 }});
    body.should.containSelector('form#confirmation').withAttributes(
        {
          action: '/card_details/123/confirm',
          method: "POST"
        });
    body.should.containSelector('button#confirm').withText("Confirm");
    body.should.containInputField('chargeId', 'hidden').withAttribute('value', '1234');
  });

  it('should have a cancel form.', function () {
    var postAction = "/post_cancel_path";
    var templateData = {
      'post_cancel_action' : postAction
    };

    var body = renderTemplate('charge', templateData);

    body.should.containSelector('form#cancel').withAttributes(
      {
        action: postAction,
        method: "POST",
        name: "cancel"
      });
  });

  it('should have a \'Cancel\' button.', function () {
    var body = renderTemplate('charge', {});
    body.should.containInputWithIdAndName('cancel-payment', 'cancel', 'submit');
  });
});
