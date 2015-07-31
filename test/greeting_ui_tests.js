var renderer = require(__dirname + '/utils/renderer.js').renderer;
var cheerio = require('cheerio');

describe('The greeting view', function () {

  it('should render both variables in a paragraph', function (done) {
    var templateData = {'greeting': 'Hello', 'name': 'World'};
    var templateName = 'greeting';

    renderer(templateName, templateData, function(htmlOutput) {
      $ = cheerio.load(htmlOutput);
      $('#greeting').text().should.equal('Hello World');
      done();
    });
  });

});
