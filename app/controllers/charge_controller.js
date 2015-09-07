require('array.prototype.find');
var logger = require('winston');

var Client = require('node-rest-client').Client;
var response = require('../utils/response.js').response;
var client = new Client();

module.exports.bindRoutesTo = function(app) {
  var CHARGE_PATH = '/charge';
  var CONFIRM_PATH = '/confirm';

  var CHARGE_VIEW = 'charge';
  var ERROR_VIEW = 'error';

  app.get(CHARGE_PATH + '/:chargeId', function(req, res) {
    logger.info('GET ' + CHARGE_PATH+'/:chargeId');

    var connectorUrl = process.env.CONNECTOR_URL.replace('{chargeId}', req.params.chargeId);

    client.get(connectorUrl, function(connectorData, connectorResponse) {

      if(connectorResponse.statusCode === 200) {
        logger.info('connector data = ', connectorData);
        var uiAmount = (connectorData.amount / 100).toFixed(2);
        var authLink = findLinkForRelation(connectorData.links, 'cardAuth');

        response(req.headers.accept, res, CHARGE_VIEW, {
          'amount' : uiAmount,
          'service_url' : connectorData.service_url,
          'card_auth_url' : authLink.href,
          'post_card_action' : CHARGE_PATH ,
          'charge_id' : req.params.chargeId
        });
        return;
      }

      renderErrorView(req,res, 'There is a problem with the payments platform');

    }).on('error', function(err) {
      logger.error('Exception raised calling connector');
      response(req.headers.accept, res, ERROR_VIEW, {
        'message': 'There is a problem with the payments platform'
      });
    });

  });

  app.post(CHARGE_PATH, function(req, res) {
    logger.info('POST ' + CHARGE_PATH);

    var payload = {
      headers:{"Content-Type": "application/json"},
      data: {
        'card_number': cleanCardNumber(req.body.cardNo),
        'cvc': req.body.cvc,
        'expiry_date': req.body.expiryDate
      }
    };

    client.post(req.body.cardUrl, payload, function(data, connectorResponse) {

      if(connectorResponse.statusCode === 204) {
        res.redirect(303, CHARGE_PATH + '/' + req.body.chargeId + CONFIRM_PATH);
        return;
      }

      renderErrorView(req,res, 'Payment could not be processed, please contact your issuing bank');

    }).on('error', function(err) {
      logger.error('Exception raised calling connector');
      response(req.headers.accept, res, ERROR_VIEW, {
        'message': 'There is a problem with the payments platform'
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

  function renderErrorView(req, res, msg) {
    logger.error('Error status code received from connector');
    response(req.headers.accept, res, ERROR_VIEW, {
      'message': msg
    });
  }
}
