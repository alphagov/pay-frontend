var getTo = require(__dirname + '/utils/test_helpers.js').get;
var app = require(__dirname + '/../server.js').getApp;

describe('The /greeting endpoint returned json', function () {

  it('should contain the following elements',

    getTo(app, '/greeting')
      .is(200)
      .contains(
      {
        'greeting': 'Hello',
        'name': 'World'
      })

  );

});
