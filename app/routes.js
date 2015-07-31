var response = require(__dirname + '/utils/response.js').response;

module.exports = {
  bind : function (app) {

    app.get('/greeting', function (req, res) {
      var data = {'greeting': 'Hello', 'name': 'World'};
      response(req.headers.accept, res, data);
    });

  }
};
