var renderer = require(__dirname + '/utils/renderer.js').renderer;
var cheerio = require('cheerio');
var assert = require('chai').assert;


describe('The charge view', function() {

  function renderCharge(templateData, checkFunction) {
    renderer('charge', templateData, function(htmlOutput) {
      var $ = cheerio.load(htmlOutput);
      checkFunction($);
    });
  }

  it('should render the amount', function(done) {
    var templateData = {
      'amount' : '50.00'
    };

    renderCharge(templateData, function($) {
      $('#amount').text().should.equal('£50.00');
      done();
    });
  });

  it('should have a submit form.', function(done) {
    var postAction = "/post_card_path";
    var templateData = {
      'post_card_action' : postAction
    };

    renderCharge(templateData, function($) {
      var cardForm = $('form#cardDetails');
      cardForm.attr('action').should.equal(postAction);
      cardForm.attr('method').should.equal("POST");
      cardForm.attr('name').should.equal("cardDetails");
      done();
    });
  });

  it('should have a \'Back to service\' button.', function(done) {
    var serviceUrl = "http://example.com/service";
    var templateData = {
      'service_url' : serviceUrl
    };

    renderCharge(templateData, function($) {
      $('#back').attr('href').should.equal(serviceUrl);
      done();
    });
  });

  it('should not show the \'Back to service\' when no service_url passed.', function(done) {
    renderCharge({}, function($) {
      $('#back').should.have.length(0);
      done();
    });
  });

  it('should have a \'Make payment\' button.', function(done) {
    renderCharge({}, function($) {
      checkInputField($, 'submitCardDetails', 'submit');
      done();
    });
  });

  it('should show all input fields.', function (done) {
    renderCharge({}, function($) {
      checkInputFieldWithLabel($, 'cardNo', 'text', 'cardNo-lbl', 'Card number', '19');
      checkInputFieldWithLabel($, 'cvc', 'text', 'cvc-lbl', 'Card security code', '3');
      checkInputFieldWithLabel($, 'expiryDate', 'text', 'expiryDate-lbl', 'Expiry date', '5');
      checkInputFieldWithLabel($, 'cardholderName', 'text', 'cardholderName-lbl', 'Name on card', '200');
      checkInputFieldWithLabel($, 'addressLine1', 'text', 'addressLine1-lbl', 'Billing address', '100');
      checkInputField($, 'addressLine2', 'text', '100');
      checkInputField($, 'addressLine3', 'text', '100');
      checkInputFieldWithLabel($, 'addressCity', 'text', 'addressCity-lbl', 'Town or city', '100');
      checkInputFieldWithLabel($, 'addressCounty', 'text', 'addressCounty-lbl', 'County', '100');
      checkInputFieldWithLabel($, 'addressPostcode', 'text', 'addressPostcode-lbl', 'Postcode', '10');
      done();
    });
  });

  function checkInputField($, id, inputType, maxLength) {
    var inputElement = $('input#' + id);

    inputElement.should.have.length(1);
    inputElement.attr('name').should.equal(id);
    inputElement.attr('type').should.equal(inputType);

    if(maxLength) {
      inputElement.attr('maxlength').should.equal(maxLength);
    }
  }

  function checkInputFieldWithLabel($, id, inputType, labelId, labelText, maxLength) {
    var labelElement = $('label#' + labelId);

    labelElement.should.have.length(1);
    labelElement.attr('for').should.equal(id);
    var actualLabelText = labelElement.html().trim();
    assert(actualLabelText.indexOf(labelText) === 0, actualLabelText + "\ndid not start with " + labelText);
    checkInputField($, id, inputType, maxLength);
  }
});


describe('The confirm view', function() {

  it('should render the following fields', function(done) {
    var templateData = {
      'cardNumber' : "************5100",
      'expiryDate' : "11/99",
      'amount' : "10.00",
    };

    renderer('confirm', templateData, function(htmlOutput) {
      $ = cheerio.load(htmlOutput);
      $('#cardNumber').text().should.equal('************5100');
      $('#expiryDate').text().should.equal('11/99');
      $('#amount').text().should.equal('£10.00');
    });

    done();

  });

});