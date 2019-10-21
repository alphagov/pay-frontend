'use strict'

// NPM dependencies
const csrf = require('csrf')

// Local dependencies
const logger = require('../utils/logger')(__filename)
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
  var chargeId
  var gatewayAccountId
  var gatewayAccountType
  try {
    const chargeData = await Charge(correlationId).findByToken(chargeTokenId)
    chargeId = chargeData.charge.externalId
    gatewayAccountId = chargeData.charge.gatewayAccount.gateway_account_id
    gatewayAccountType = chargeData.charge.gatewayAccount.type
    if (chargeData.used === true) {
      if (!getSessionVariable(req, createChargeIdSessionKey(chargeId))) {
        throw new Error('UNAUTHORISED')
      }
      logger.info('Token being reused for chargeId %s, gatewayAccountId %s, gateway account type %s', chargeId, gatewayAccountId, gatewayAccountType)
      const stateName = chargeData.charge.status.toUpperCase().replace(/\s/g, '_')
      responseRouter.response(req, res, stateName, {
        chargeId: chargeId,
        returnUrl: paths.generateRoute('card.return', { chargeId })
      })
    } else {
      logger.info('Token used for the first time for chargeId %s, gatewayAccountId %s, gateway account type %s', chargeId, gatewayAccountId, gatewayAccountType)
      await Token.markTokenAsUsed(chargeTokenId, correlationId)
      setSessionVariable(req, createChargeIdSessionKey(chargeId), { csrfSecret: csrf().secretSync() })
      res.redirect(303, generateRoute(resolveActionName(chargeData.charge.status, 'get'), { chargeId }))
    }
  } catch (err) {
    if (err.message === 'UNAUTHORISED') {
      logger.info('Call to /secure/{tokenId} is Unauthorised. This could be due to the token not existing, ' +
        'the frontend state cookie not existing, or the frontend state cookie containing an invalid value.')
      return responseRouter.response(req, res, 'UNAUTHORISED')
    }
    logging.systemError('Secure controller token', correlationId, chargeId, gatewayAccountId, gatewayAccountType)
    responseRouter.response(req, res, 'SYSTEM_ERROR', withAnalyticsError())
  }
}
