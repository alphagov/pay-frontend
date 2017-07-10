var paths = require('../paths.js')
var Token = require('../models/token.js')
var Charge = require('../models/charge.js')
var views = require('../utils/views.js')
var session = require('../utils/session.js')
var cookie = require('../utils/cookies')
var csrf = require('csrf')
var CORRELATION_HEADER = require('../utils/correlation_header.js').CORRELATION_HEADER
var withAnalyticsError = require('../utils/analytics.js').withAnalyticsError
var stateService = require('../services/state_service.js')

module.exports.new = function (req, res) {
  'use strict'

  var chargeTokenId = req.params.chargeTokenId || req.body.chargeTokenId
  var correlationId = req.headers[CORRELATION_HEADER] || ''

  var init = function () {
    var charge = Charge(correlationId)
    charge.findByToken(chargeTokenId)
        .then(chargeRetrieved, apiFail)
  }

  var chargeRetrieved = function (chargeData) {
    var token = Token(correlationId)
    token.destroy(chargeTokenId)
          .then(apiSuccess(chargeData), apiFail)
  }

  var apiSuccess = function (chargeData) {
    var chargeId = chargeData.externalId

    cookie.setSessionVariable(req, session.createChargeIdSessionKey(chargeId), {
      csrfSecret: csrf().secretSync()
    })

    var actionName = stateService.resolveActionName(chargeData.status, 'get')
    res.redirect(303, paths.generateRoute(actionName, {chargeId: chargeId}))
  }

  var apiFail = function () {
    views.create().display(res, 'SYSTEM_ERROR', withAnalyticsError())
  }
  init()
}
