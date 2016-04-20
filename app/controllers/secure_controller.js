var paths = require('../paths.js'),
  Token = require('../models/token.js'),
  Charge = require('../models/charge.js'),
  views = require('../utils/views.js'),
  session = require('../utils/session.js'),
  csrf = require('csrf'),
  stateService = require('../services/state_service.js');

module.exports.new = function (req, res) {
  'use strict';

  var chargeTokenId = req.params.chargeTokenId || req.body.chargeTokenId,

    init = function () {
      Charge.findByToken(chargeTokenId)
        .then(chargeRetrieved, apiFail);
    },

    chargeRetrieved = function (chargeData) {
      Token.destroy(chargeTokenId).then(function () {
        tokenDeleted(chargeData);
      }, apiFail);
    },

    tokenDeleted = function (chargeData) {
      var chargeId = chargeData.externalId;

      req.frontend_state[session.createChargeIdSessionKey(chargeId)] = {
        csrfSecret: csrf().secretSync()
      };

      var actionName = stateService.resolveActionName(chargeData.status,'get');
      res.redirect(303, paths.generateRoute(actionName, {chargeId: chargeId}));
    },

    apiFail = function () {
      views.create().display(res, 'SYSTEM_ERROR');
    };
  init();
};
           