'use strict'

// NPM dependencies
const csrf = require('csrf')

// Local dependencies
const {generateRoute} = require('../paths')
const Token = require('../models/token')
const Charge = require('../models/charge')
const responseRouter = require('../utils/response_router')
const {createChargeIdSessionKey} = require('../utils/session')
const {setSessionVariable} = require('../utils/cookies')
const CORRELATION_HEADER = require('../../config/correlation_header').CORRELATION_HEADER
const withAnalyticsError = require('../utils/analytics').withAnalyticsError
const {resolveActionName} = require('../services/state_service')

exports.new = (req, res) => {
  const chargeTokenId = req.params.chargeTokenId || req.body.chargeTokenId
  const correlationId = req.headers[CORRELATION_HEADER] || ''
  Charge(correlationId).findByToken(chargeTokenId)
    .then(chargeData => Token.destroy(chargeTokenId, correlationId).then(() => Promise.resolve(chargeData)))
    .then(chargeData => {
      const chargeId = chargeData.externalId
      setSessionVariable(req, createChargeIdSessionKey(chargeId), {csrfSecret: csrf().secretSync()})
      res.redirect(303, generateRoute(resolveActionName(chargeData.status, 'get'), {chargeId}))
    })
    .catch(() => {
      responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalyticsError())
    })
}
