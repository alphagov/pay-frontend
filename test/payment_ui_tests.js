var renderer = require(__dirname + '/utils/renderer.js').renderer;
var cheerio = require('cheerio');

describe('The charge view', function () {

  it('should render both variables in a paragraph', function (done) {
    var templateData = {'amount': '50.00'};
    var templateName = 'charge';

    renderer(templateName, templateData, function(htmlOutput) {
      $ = cheerio.load(htmlOutput);
      $('#amount').text().should.equal('£50.00');
      done();
    });
  });

});
