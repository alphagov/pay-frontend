const paths = require('../paths.js')
const Token = require('../models/token.js')
const Charge = require('../models/charge.js')
const views = require('../utils/views.js')
const session = require('../utils/session.js')
const cookie = require('../utils/cookies')
const csrf = require('csrf')
const CORRELATION_HEADER = require('../utils/correlation_header.js').CORRELATION_HEADER
const withAnalyticsError = require('../utils/analytics.js').withAnalyticsError
const stateService = require('../services/state_service.js')

function chargeRetrievedPartial (req, res, chargeTokenId, correlationId) {
  return function (chargeData) {
    const token = Token(correlationId)
    token.destroy(chargeTokenId)
        .then(apiSuccess(chargeData, req, res), () => {
          views.create().display(res, 'SYSTEM_ERROR', withAnalyticsError())
        })
  }
}

function apiSuccess (chargeData, req, res) {
  const chargeId = chargeData.externalId
  cookie.setSessionVariable(req, session.createChargeIdSessionKey(chargeId), {
    csrfSecret: csrf().secretSync()
  })
  const actionName = stateService.resolveActionName(chargeData.status, 'get')
  res.redirect(303, paths.generateRoute(actionName, {chargeId: chargeId}))
}

module.exports = {
  new: function (req, res) {
    const chargeTokenId = req.params.chargeTokenId || req.body.chargeTokenId
    const correlationId = req.headers[CORRELATION_HEADER] || ''
    Charge.findByToken(chargeTokenId, correlationId)
        .then(chargeRetrievedPartial(req, res, chargeTokenId, correlationId),
            () => {
              views.create().display(res, 'SYSTEM_ERROR', withAnalyticsError())
            })
  }
}
