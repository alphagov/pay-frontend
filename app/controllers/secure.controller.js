'use strict'

// NPM dependencies
const csrf = require('csrf')
const {
  PAYMENT_EXTERNAL_ID,
  GATEWAY_ACCOUNT_ID,
  GATEWAY_ACCOUNT_TYPE
} = require('@govuk-pay/pay-js-commons').logging.keys

// Local dependencies
const logger = require('../utils/logger')(__filename)
const { setLoggingField, getLoggingFields } = require('../utils/logging-fields-helper')
const { generateRoute } = require('../paths')
const Token = require('../models/token')
const Charge = require('../models/charge')
const responseRouter = require('../utils/response-router')
const { createChargeIdSessionKey } = require('../utils/session')
const { setSessionVariable, getSessionVariable } = require('../utils/cookies')
const CORRELATION_HEADER = require('../../config/correlation-header').CORRELATION_HEADER
const withAnalyticsError = require('../utils/analytics').withAnalyticsError
const { resolveActionName } = require('../services/state.service')
const paths = require('../paths')

exports.new = async function (req, res) {
  const chargeTokenId = req.params.chargeTokenId || req.body.chargeTokenId
  const correlationId = req.headers[CORRELATION_HEADER] || ''
  try {
    const tokenResponse = await Charge(correlationId).findByToken(chargeTokenId, getLoggingFields(req))
    let chargeId, gatewayAccountId, gatewayAccountType

    // Temporarily support both the new and old response schemas from connector
    if (tokenResponse.charge.externalId) {
      chargeId = tokenResponse.charge.externalId
      gatewayAccountId = tokenResponse.charge.gatewayAccount.gateway_account_id
      gatewayAccountType = tokenResponse.charge.gatewayAccount.type
    } else {
      chargeId = tokenResponse.charge.charge_id
      gatewayAccountId = tokenResponse.charge.gateway_account.gateway_account_id
      gatewayAccountType = tokenResponse.charge.gateway_account.type
    }

    const chargeStatus = tokenResponse.charge.status

    setLoggingField(req, PAYMENT_EXTERNAL_ID, chargeId)
    setLoggingField(req, GATEWAY_ACCOUNT_ID, gatewayAccountId)
    setLoggingField(req, GATEWAY_ACCOUNT_TYPE, gatewayAccountType)

    if (tokenResponse.used === true) {
      if (!getSessionVariable(req, createChargeIdSessionKey(chargeId))) {
        throw new Error('UNAUTHORISED')
      }
      logger.info('Payment token being reused', getLoggingFields(req))
      const stateName = chargeStatus.toUpperCase().replace(/\s/g, '_')
      responseRouter.response(req, res, stateName, {
        chargeId: chargeId,
        returnUrl: paths.generateRoute('card.return', { chargeId })
      })
    } else {
      logger.info('Payment token used for the first time', getLoggingFields(req))
      await Token.markTokenAsUsed(chargeTokenId, correlationId, getLoggingFields(req))
      setSessionVariable(req, createChargeIdSessionKey(chargeId), { csrfSecret: csrf().secretSync() })
      res.redirect(303, generateRoute(resolveActionName(chargeStatus, 'get'), { chargeId }))
    }
  } catch (err) {
    if (err.message === 'UNAUTHORISED') {
      logger.info('Call to /secure/{tokenId} is Unauthorised. This could be due to the token not existing, ' +
        'the frontend state cookie not existing, or the frontend state cookie containing an invalid value.',
      getLoggingFields(req))
      return responseRouter.response(req, res, 'UNAUTHORISED')
    }
    responseRouter.systemErrorResponse(req, res, 'Error exchanging payment token', withAnalyticsError(), err)
  }
}
