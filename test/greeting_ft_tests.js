var response_to = require(__dirname + '/utils/test_helpers.js').response_to;
var app = require(__dirname + '/../server.js').getApp;

describe('The /greeting endpoint returned json', function () {

  it('should contain the following elements', response_to(app, '/greeting').contains(
    {
      'greeting': 'Hello',
      'name': 'World'
    }
  ));

});
