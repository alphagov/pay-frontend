
var renderTemplate = require(__dirname + '/test_helpers/html_assertions.js').render;

 describe('The propositional navigation layout include', function() {
  it('should render the service name', function() {
    var serviceName = 'Service Name';
    var body = renderTemplate('includes/propositional_navigation', { 'session' : {
      'serviceName': serviceName
    }});
    body.should.containSelector('#proposition-menu span').withText(serviceName);

  });
});
