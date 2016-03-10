var response = require(__dirname + '/utils/response.js').response;

var controllers   = require('./controllers');
var paths         = require(__dirname + '/paths.js');
var generateRoute = require(__dirname + '/utils/generate_route.js');

module.exports.generateRoute = generateRoute;
module.exports.paths = paths;


module.exports.bind = function (app) {
    app.get('/greeting', function (req, res) {
      var data = {'greeting': 'Hello', 'name': 'World'};
      response(req.headers.accept, res, 'greeting', data);
    });

    controllers.bindRoutesTo(app);
};
