var calling = require(__dirname + '/utils/calling_ft.js').calling;
var app = require(__dirname + '/../server.js').getApp;

describe('The /greeting endpoint returned json', function () {

  it('should return greeting and name attributes', function (done) {

    calling(app, '/greeting',
    {
      'greeting': 'Hello',
      'name': 'World'
    },
    done);

  });

});
