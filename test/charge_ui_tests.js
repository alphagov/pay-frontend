var renderer = require(__dirname + '/utils/renderer.js').renderer;
var cheerio = require('cheerio');

describe('The charge view', function () {

  function renderCharge(templateData, checkFunction) {
    renderer('charge', templateData, function(htmlOutput) {
      $ = cheerio.load(htmlOutput);
      checkFunction($);
    });
  };

  it('should render the amount', function (done) {
    var templateData = {'amount': '50.00'};

    renderCharge(templateData, function($) {
      $('#amount').text().should.equal('£50.00');
      done();
    });
  });

  it('should have a submit form.', function(done) {
    var cardAuthUrl = "http://connector.service/post_card_url";
    var templateData = { 'card_auth_url': cardAuthUrl };

    renderCharge(templateData, function($) {
      $('form#cardDetails').attr('action').should.equal(cardAuthUrl);
      $('form#cardDetails').attr('method').should.equal("POST");
      $('form#cardDetails').attr('name').should.equal("cardDetails");
      done();
    });
  });

  it('should have a \'Back to service\' button.', function(done) {
    var serviceUrl = "http://example.com/service";
    var templateData = { 'service_url': serviceUrl };

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
      checkInputFieldWithLabel($, 'cardNo', 'text', 'cardNo-lbl');
      checkInputFieldWithLabel($, 'cvc', 'text', 'cvc-lbl');
      checkInputFieldWithLabel($, 'expiryDate', 'text', 'expiryDate-lbl');
      done();
    });
  });

  function checkInputField($, id, inputType) {
    var inputElement = $('input#' + id);

    inputElement.should.have.length(1);
    inputElement.attr('name').should.equal(id);
    inputElement.attr('type').should.equal(inputType);
  }

  function checkInputFieldWithLabel($, id, inputType, labelId) {
    var labelElement = $('label#' + labelId);

    labelElement.should.have.length(1);
    labelElement.attr('for').should.equal(id);
    checkInputField($, id, inputType);
  }
});
