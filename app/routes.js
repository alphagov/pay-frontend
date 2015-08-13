var Client = require('node-rest-client').Client;
var response = require(__dirname + '/utils/response.js').response;
var client = new Client();

module.exports = {
  bind : function (app) {
    app.get('/greeting', function (req, res) {
      var data = {'greeting': 'Hello', 'name': 'World'};
      response(req.headers.accept, res, 'greeting', data);
    });

    app.get('/payment/:payid', function(req, res) {
      var connectorUrl = process.env.CONNECTOR_URL.replace('{payId}', req.params.payid);
      var args = {
        headers: {}
      };
      client.get(connectorUrl, args, function(connectorData, connectorResponse) {
        var uiAmount = (connectorData.amount/100).toFixed(2);
        response(req.headers.accept, res, 'payment', {"amount": uiAmount});
      });
    });
  }
};
