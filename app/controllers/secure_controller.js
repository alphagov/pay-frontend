var paths = require('../paths.js'),
  Token = require('../models/token.js'),
  Charge = require('../models/charge.js'),
  Card = require('../models/card.js')(),
  views = require('../utils/views.js'),
  session = require('../utils/session.js'),
  csrf = require('csrf'),
  stateService = require('../services/state_service.js'),
  normaliseCards = require('../services/normalise_cards.js'),
  q = require('q'),
  _ = require('lodash');

module.exports.new = function (req, res) {
  'use strict';

  var chargeTokenId = req.params.chargeTokenId || req.body.chargeTokenId,

    init = function () {
      Charge.findByToken(chargeTokenId)
        .then(chargeRetrieved, apiFail);
    },

    chargeRetrieved = function (chargeData) {
      q.all([
        Card.allConnectorCardTypes(),
        Token.destroy(chargeTokenId),
      ]).then(function(values){
        var selfServiceCards = chargeData.gatewayAccount.cardTypes;

        if (selfServiceCards && selfServiceCards.length !== 0) {
          apiSuccess(chargeData,normaliseCards(selfServiceCards));
          return;
        }

        apiSuccess(chargeData,normaliseCards(values[0]));
      },apiFail);

    },

    apiSuccess = function (chargeData, cardTypes) {
      var chargeId = chargeData.externalId;

      req.frontend_state[session.createChargeIdSessionKey(chargeId)] = {
        csrfSecret: csrf().secretSync(),
        serviceName: _.get(chargeData, "gatewayAccount.service_name"),
        cardTypes: cardTypes
      };

      var actionName = stateService.resolveActionName(chargeData.status,'get');
      res.redirect(303, paths.generateRoute(actionName, {chargeId: chargeId}));
    },

    apiFail = function () {
      views.create().display(res, 'SYSTEM_ERROR');
    };
  init();
};
