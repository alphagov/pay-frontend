var responseTo = require(__dirname + '/test_helpers/test_helpers.js').responseTo;
var app = require(__dirname + '/../server.js').getApp;

describe('The /greeting endpoint returned json', function () {

  it('should contain the following elements', responseTo(app, '/greeting').contains(
    {
      'greeting': 'Hello',
      'name': 'World'
    }
  ));

});
