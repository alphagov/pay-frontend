var renderTemplate = require(__dirname + '/test_helpers/html_assertions.js').render;

describe('The greeting view', function () {

  it('should render both variables in a paragraph', function () {
    var templateData = {'greeting': 'Hello', 'name': 'World'};

    var body = renderTemplate('greeting', templateData);
    body.should.containSelector('#greeting').withText('Hello World');
  });

});
