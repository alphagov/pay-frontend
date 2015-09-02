require('array.prototype.find');

var Client = require('node-rest-client').Client;
var response = require('../utils/response.js').response;
var client = new Client();

module.exports.bindRoutesTo = function(app) {

    app.get('/charge/:chargeId', function(req, res) {
      var connectorUrl = process.env.CONNECTOR_URL.replace('{chargeId}', req.params.chargeId);

      client.get(connectorUrl, function(connectorData, connectorResponse) {
        var uiAmount = (connectorData.amount / 100).toFixed(2);
        var authLink = findLinkForRelation(connectorData.links, 'cardAuth');

        response(req.headers.accept, res, 'charge',
            {
                'amount': uiAmount,
                'service_url': connectorData.service_url,
                'card_auth_url': authLink.href
            }
        );
      });
    });

    function findLinkForRelation(links, rel) {
        return links.find(function(link) {
            return link.rel === rel;
        });
    }
}
