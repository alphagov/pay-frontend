var paths = require('../paths.js'),
  Token = require('../models/token.js'),
  Charge = require('../models/charge.js'),
  views = require('../utils/views.js'),
  session = require('../utils/session.js'),
  csrf = require('csrf'),
  CORRELATION_HEADER = require('../utils/correlation_header.js').CORRELATION_HEADER,
  stateService = require('../services/state_service.js');

module.exports.new = function (req, res) {
  'use strict';

  var chargeTokenId = req.params.chargeTokenId || req.body.chargeTokenId,
      correlationId = req.headers[CORRELATION_HEADER] || '',

    init = function () {
      var charge  = Charge(correlationId);
      charge.findByToken(chargeTokenId)
        .then(chargeRetrieved, apiFail);
    },

    chargeRetrieved = function (chargeData) {
      var token = Token(correlationId);
      token.destroy(chargeTokenId)
          .then(apiSuccess(chargeData),apiFail);
    },

    apiSuccess = function (chargeData) {
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
