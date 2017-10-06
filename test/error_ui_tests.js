var path = require('path')
var renderTemplate = require(path.join(__dirname, '/test_helpers/html_assertions.js')).render

describe('The error view', function () {
  it('should render an error message', function (done) {
    var msg = 'shut up and take my money!'
    renderTemplate('error', { 'message': msg }, function (err, body) {
      if (err) done(err)
      body.should.containSelector('#errorMsg').withText(msg)
      done()
    })
  })
})
