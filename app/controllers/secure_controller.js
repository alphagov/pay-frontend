require('array.prototype.find');
var logger = require('winston');

var Client = require('node-rest-client').Client;
var response = require('../utils/response.js').response;
var client = new Client();

module.exports.bindRoutesTo = function(app) {
  var CHARGE_PATH = '/charge';
  var CARD_DETAILS_PATH = '/card_details';

  app.get(CHARGE_PATH + '/:chargeId?', function(req, res) {
    logger.info('GET ' + CHARGE_PATH + '/:chargeId');

    var chargeTokenId = req.query.chargeTokenId;
    logger.info('req.query.chargeTokenId=' + chargeTokenId);

    var chargeId = req.params.chargeId;
    var sessionChargeIdKey = 'ch_' + chargeId;

    logger.info('req.session_state[' + sessionChargeIdKey + ']=' + req.session_state[sessionChargeIdKey])

    if(!req.session_state[sessionChargeIdKey]) {
      var connectorUrl = process.env.CONNECTOR_TOKEN_URL.replace('{chargeTokenId}', chargeTokenId);

      logger.info('trying to validate token=' + chargeTokenId);
      client.get(connectorUrl, function(tokenVerifyData, tokenVerifyResponse) {
        logger.info('response from the connector=' + tokenVerifyResponse.statusCode);
        if(tokenVerifyResponse.statusCode === 200) {
          logger.info('valid token found chargeTokenId=' + chargeTokenId)
          logger.info('tokenVerifyData=', tokenVerifyData);
          if(chargeId != tokenVerifyData.chargeId) {
            logger.error('Unexpected: chargeId from connector=' + tokenVerifyData.chargeId + ' != chargeId from query=' + chargeId);

            renderErrorView(req,res, 'There is a problem with the payments platform');
            return;
          }

          logger.info('trying to delete token=' + chargeTokenId);
          client.delete(connectorUrl, function(tokenDeleteData, tokenDeleteResponse) {
            logger.info('response from the connector=' + tokenDeleteResponse.statusCode);
            if(tokenDeleteResponse.statusCode === 204) {
              req.session_state[sessionChargeIdKey] = true;
              res.redirect(303, CARD_DETAILS_PATH + '/' + chargeId);
              return;
            }
            logger.error('Failed to delete token=' + chargeTokenId + ' response code from connector=' + tokenDeleteResponse.statusCode);
            renderErrorView(req, res, 'There is a problem with the payments platform');
          });
          return;
        }
        if(tokenVerifyResponse.statusCode === 404) {
          logger.error('Token has already been used!');
          res.status(400).send('There is a problem with the payments platform');
          return;
        } else {
          logger.error('Unexpected response code:' + connectorResponse.statusCode);
        }
        renderErrorView(req, res, 'There is a problem with the payments platform');
        return;
      }).on('error', function(err) {
        logger.error('Exception raised calling connector');
        renderErrorView(req, res, 'There is a problem with the payments platform');
      });
      return;
    } else {
      logger.info('token already verified chargeTokenId=' + req.query.chargeTokenId);
    }

    res.redirect(303, CARD_DETAILS_PATH + '/' + chargeId);
  });
};
