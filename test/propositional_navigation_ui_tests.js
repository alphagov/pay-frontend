var path = require('path')
var renderTemplate = require(path.join(__dirname, '/test_helpers/html_assertions.js')).render

describe('The propositional navigation layout include', function () {
  it('should render the service name', function () {
    var serviceName = 'Service Name'
    var body = renderTemplate('includes/propositional_navigation', {gatewayAccount: {'serviceName': serviceName}})
    body.should.containSelector('#proposition-menu span').withText(serviceName)
  })
})
