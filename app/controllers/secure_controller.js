'use strict'

// npm dependencies
const csrf = require('csrf')

// local dependencies
const {generateRoute} = require('../paths.js')
const Token = require('../models/token.js')
const Charge = require('../models/charge.js')
const views = require('../utils/views.js')
const {createChargeIdSessionKey} = require('../utils/session.js')
const {setSessionVariable} = require('../utils/cookies')
const CORRELATION_HEADER = require('../utils/correlation_header.js').CORRELATION_HEADER
const withAnalyticsError = require('../utils/analytics.js').withAnalyticsError
const {resolveActionName} = require('../services/state_service.js')
const {giveUserChargeId} = require('../utils/distributed_session_store.js')

exports.new = (req, res) => {
  const chargeTokenId = req.params.chargeTokenId || req.body.chargeTokenId
  const correlationId = req.headers[CORRELATION_HEADER] || ''

  Charge(correlationId).findByToken(chargeTokenId)
      .then(chargeData => Token(correlationId).destroy(chargeTokenId).then(() => Promise.resolve(chargeData)))
      .then(chargeData => {
        const chargeId = chargeData.externalId

        // Old place
        setSessionVariable(req, createChargeIdSessionKey(chargeId), {csrfSecret: csrf().secretSync()})

        // Write now we are writing to both places
        // After a baking in period we will read from this place exclusively
        // And stop setting it above
        giveUserChargeId(
          req,
          req.userId,
          chargeId
        )

        res.redirect(303, generateRoute(resolveActionName(chargeData.status, 'get'), {chargeId}))
      })
      .catch(() => views.display(res, 'SYSTEM_ERROR', withAnalyticsError()))
}
