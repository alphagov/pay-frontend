var renderer = require(__dirname + '/utils/renderer.js').renderer;
var cheerio = require('cheerio');

describe('The charge view', function() {

  function renderCharge(templateData, checkFunction) {
    renderer('charge', templateData, function(htmlOutput) {
      $ = cheerio.load(htmlOutput);
      checkFunction($);
    });
  };

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

  it('should have a hidden field for the chargeId and POST card URL of the connector.', function(done) {
    var chargeId = "43624765765";
    var cardAuthUrl = "http://connector.service/post_card_url";
    var templateData = {
      'card_auth_url' : cardAuthUrl,
      'charge_id' : chargeId
    };

    renderCharge(templateData, function($) {
      checkInputField($, 'cardUrl', 'hidden');
      checkInputField($, 'chargeId', 'hidden');
      $('input#cardUrl').val().should.equal(cardAuthUrl);
      $('input#chargeId').val().should.equal(chargeId);
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

  it('should show required input fields.', function(done) {
    renderCharge({}, function($) {
      checkInputFieldWithLabel($, 'cardNo', 'text', 'cardNo-lbl', '19');
      checkInputFieldWithLabel($, 'cvc', 'text', 'cvc-lbl', '3');
      checkInputFieldWithLabel($, 'expiryDate', 'text', 'expiryDate-lbl', '5');
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
  };

  function checkInputFieldWithLabel($, id, inputType, labelId, maxLength) {
    var labelElement = $('label#' + labelId);

    labelElement.should.have.length(1);
    labelElement.attr('for').should.equal(id);
    checkInputField($, id, inputType, maxLength);
  };
});
