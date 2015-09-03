require('array.prototype.find');

var Client = require('node-rest-client').Client;
var response = require('../utils/response.js').response;
var client = new Client();

module.exports.bindRoutesTo = function(app) {
  var chargePath = '/charge';
  var confirmPath = '/confirm';

  var chargeView = 'charge';
  var errorView = 'error';

  app.get(chargePath + '/:chargeId', function(req, res) {
    var connectorUrl = process.env.CONNECTOR_URL.replace('{chargeId}', req.params.chargeId);

    client.get(connectorUrl, function(connectorData, connectorResponse) {
      var uiAmount = (connectorData.amount / 100).toFixed(2);
      var authLink = findLinkForRelation(connectorData.links, 'cardAuth');

      response(req.headers.accept, res, chargeView, {
        'amount' : uiAmount,
        'service_url' : connectorData.service_url,
        'card_auth_url' : authLink.href,
        'post_card_action' : chargePath ,
        'charge_id' : req.params.chargeId
      });
    });
  });

  app.post(chargePath, function(req, res) {
    var cardData = {
      data: {
        'card_number': cleanCardNumber(req.body.cardNo),
        'cvc': req.body.cvc,
        'expiry_date': req.body.expiryDate
      }
    };
    client.post(req.body.cardUrl, cardData, function(data, connectorResponse) {
      if(connectorResponse.statusCode == 204) {
        res.redirect(303, chargePath + '/' + req.body.chargeId + confirmPath);
        return;
      }

      response(req.headers.accept, res, errorView, {
        'message': 'Payment could not be processed, please contact your issuing bank'
      });
    });
  });

  function findLinkForRelation(links, rel) {
    return links.find(function(link) {
      return link.rel === rel;
    });
  }

  function cleanCardNumber(cardNumber) {
    return cardNumber.replace(/\s/g, "")
  }
}
