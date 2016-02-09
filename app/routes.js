var response = require(__dirname + '/utils/response.js').response;

var controllers = require('./controllers');

module.exports.bind = function (app) {
    app.get('/greeting', function (req, res) {
      var data = {'greeting': 'Hello', 'name': 'World'};
      res.setHeader('Content-Type', 'application/json');
      res.json(data);
    });

    controllers.bindRoutesTo(app);
};
