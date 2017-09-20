var path = require('path')
var renderTemplate = require(path.join(__dirname, '/test_helpers/html_assertions.js')).render
var should = require('chai').should() // eslint-disable-line

describe('The propositional navigation layout include', function () {
  it('should render the service name', function (done) {
    var serviceName = 'Service Name'
    renderTemplate('includes/propositional_navigation', {gatewayAccount: {'serviceName': serviceName}}, function (err, body) {
      if (err) done(err)
      body.should.containSelector('#proposition-menu span').withText(serviceName)
      done()
    })
  })
})
