require('array.prototype.find');
var logger          = require('winston');
var csrf            = require('csrf');
var response        = require('../utils/response.js').response;
var ERROR_MESSAGE   = require('../utils/response.js').ERROR_MESSAGE;
var ERROR_VIEW      = require('../utils/response.js').ERROR_VIEW;
var renderErrorView = require('../utils/response.js').renderErrorView;
var Client          = require('node-rest-client').Client;
var client          = new Client();
var paths           = require('../paths.js');


module.exports.bindRoutesTo = function(app) {


  var show = function(req, res) {

    var chargeTokenId = req.query.chargeTokenId || req.body.chargeTokenId ;
    logger.info('req chargeTokenId=' + chargeTokenId);

    var chargeId = req.params.chargeId;
    var sessionChargeIdKey = 'ch_' + chargeId;

    logger.info('req.frontend_state[' + sessionChargeIdKey + ']=' + req.frontend_state[sessionChargeIdKey])

    if(!req.frontend_state[sessionChargeIdKey]) {
      var connectorUrl = paths.generateRoute("connectorCharge.token",{chargeTokenId: chargeTokenId});
      logger.info('trying to validate token=' + chargeTokenId);
      client
        .get(
        connectorUrl,
        secureRedirectHandler(
          req,
          res,
          chargeTokenId,
          chargeId,
          connectorUrl,
          sessionChargeIdKey
        )
      )
        .on('error', function(err) {
          logger.error('Exception raised calling connector: ' + err);
          renderErrorView(req, res, ERROR_MESSAGE);
        });
      return;
    }

    logger.info('token already verified chargeTokenId=' + req.query.chargeTokenId);

    redirectToCardDetails(res, chargeId);
  };

  app.get(paths.charge.show.path,show);
  app.post(paths.charge.show.path,show);

  function secureRedirectHandler(req, res, chargeTokenId, chargeId, connectorUrl, sessionChargeIdKey) {
    return function(tokenVerifyData, tokenVerifyResponse) {
      logger.info('response from the connector=' + tokenVerifyResponse.statusCode);

      switch(tokenVerifyResponse.statusCode) {
        case 200: {
          logger.info('valid token found chargeTokenId=' + chargeTokenId);
          logger.info('tokenVerifyData=', tokenVerifyData);
          if(chargeId != tokenVerifyData.chargeId) {
            logger.error('Unexpected: chargeId from connector=' + tokenVerifyData.chargeId + ' != chargeId from query=' + chargeId);

            renderErrorView(req,res, ERROR_MESSAGE);
            return;
          }

          logger.info('trying to delete token=' + chargeTokenId);
          client.delete(connectorUrl, function(tokenDeleteData, tokenDeleteResponse) {
            logger.info('response from the connector=' + tokenDeleteResponse.statusCode);
            if(tokenDeleteResponse.statusCode === 204) {
              req.frontend_state[sessionChargeIdKey] = {
                csrfSecret: csrf().secretSync()
              };
              redirectToCardDetails(res, chargeId);
              return;
            }
            logger.error('Failed to delete token=' + chargeTokenId + ' response code from connector=' + tokenDeleteResponse.statusCode);
            renderErrorView(req, res, ERROR_MESSAGE);
          })
            .on('error', function(err) {
              logger.error('Exception raised calling connector: ' + err);
              response(req.headers.accept, res, ERROR_VIEW, {
                'message': ERROR_MESSAGE
              });
            });
          break;
        }

        case 404: {
          if(tokenVerifyData.message == "Token has expired!") {
            logger.error(tokenVerifyData.message);
          } else {
            logger.error('Error while deleting token statusCode=' + tokenDeleteResponse.statusCode);
          }
          res.status(400).send(ERROR_MESSAGE);
          break;
        }

        default: {
          logger.error('Unexpected from connector response code:' + connectorResponse.statusCode);
          renderErrorView(req, res, ERROR_MESSAGE);
        }
      }
    };
  }

  function redirectToCardDetails(res, chargeId) {
    res.redirect(303, paths.generateRoute("card.new",{chargeId: chargeId}));
  }
};
