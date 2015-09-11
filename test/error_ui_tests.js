var renderer = require(__dirname + '/utils/renderer.js').renderer;
var cheerio = require('cheerio');

describe('The error view', function() {

  function renderErrorPage(templateData, checkFunction) {
    renderer('error', templateData, function(htmlOutput) {
      var $ = cheerio.load(htmlOutput);
      checkFunction($);
    });
  }

  it('should render an error message', function(done) {
    var msg = 'shut up and take my money!';
    renderErrorPage({ 'message' : msg }, function($) {
      $('#errorMsg').text().should.equal(msg);
      done();
    });
  });
});
