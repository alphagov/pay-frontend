'use strict'

// NPM dependencies
const lodash = require('lodash')

// Local dependencies
const logger = require('../utils/logger')(__filename)
const responseRouter = require('../utils/response_router')
const stateService = require('../services/state_service')
const State = require('../../config/state.js')
const paths = require('../paths')
const withAnalyticsError = require('../utils/analytics').withAnalyticsError

module.exports = (req, res, next) => {
  let correctStates = stateService.resolveStates(req.actionName)
  const currentState = req.chargeData.status

  const paymentProvider = req.chargeData.gateway_account.payment_provider
  if (paymentProvider === 'stripe' && currentState === State.AUTH_3DS_READY) {
    correctStates.push(State.AUTH_3DS_READY)
  }
  if (!correctStates.includes(currentState)) {
    logger.error(`State enforcer status doesn't match: current charge state from \
    connector [${currentState}], expected [${correctStates}] for charge [${req.chargeId}] \
    with payment provider [${paymentProvider}]`)
    const stateName = currentState.toUpperCase().replace(/\s/g, '_')
    responseRouter.response(req, res, stateName, {
      chargeId: req.chargeId,
      returnUrl: paths.generateRoute('card.return', { chargeId: req.chargeId }),
      analytics: getGoogleAnalytics(req)
    })
  } else {
    next()
  }
}

function getGoogleAnalytics (req) {
  const gatewayAccount = lodash.get(req, 'chargeData.gateway_account')
  if (gatewayAccount) {
    return {
      // The state enforcer will append the correct analytics page to the base charge path
      'path': paths.generateRoute(`card.new`, { chargeId: req.chargeId }),
      'analyticsId': gatewayAccount.analytics_id,
      'type': gatewayAccount.type,
      'paymentProvider': gatewayAccount.payment_provider
    }
  }
  return withAnalyticsError().analytics
}
