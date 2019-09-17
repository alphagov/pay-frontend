'use strict'

// NPM dependencies
const csrf = require('csrf')

// Local dependencies
const logging = require('../utils/logging')
const { generateRoute } = require('../paths')
const Token = require('../models/token')
const Charge = require('../models/charge')
const responseRouter = require('../utils/response_router')
const { createChargeIdSessionKey } = require('../utils/session')
const { setSessionVariable, getSessionVariable } = require('../utils/cookies')
const CORRELATION_HEADER = require('../../config/correlation_header').CORRELATION_HEADER
const withAnalyticsError = require('../utils/analytics').withAnalyticsError
const { resolveActionName } = require('../services/state_service')
const paths = require('../paths')

exports.new = async function (req, res) {
  const chargeTokenId = req.params.chargeTokenId || req.body.chargeTokenId
  const correlationId = req.headers[CORRELATION_HEADER] || ''
  try {
    const chargeData = await Charge(correlationId).findByToken(chargeTokenId)
    if (chargeData.used === true) {
      if (!getSessionVariable(req, createChargeIdSessionKey(chargeData.charge.externalId))) {
        throw new Error()
      }
      const stateName = chargeData.charge.status.toUpperCase().replace(/\s/g, '_')
      responseRouter.response(req, res, stateName, {
        chargeId: chargeData.charge.externalId,
        returnUrl: paths.generateRoute('card.return', { chargeId: chargeData.charge.externalId })
      })
    } else {
      await Token.markTokenAsUsed(chargeTokenId, correlationId)
      const chargeId = chargeData.charge.externalId
      setSessionVariable(req, createChargeIdSessionKey(chargeId), { csrfSecret: csrf().secretSync() })
      res.redirect(303, generateRoute(resolveActionName(chargeData.charge.status, 'get'), { chargeId }))
    }
  } catch (err) {
    logging.systemError('Secure controller token', correlationId, chargeTokenId)
    responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalyticsError())
  }
}
