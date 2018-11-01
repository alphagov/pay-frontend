'use strict'

// npm dependencies
const lodash = require('lodash')

// local dependencies
const views = require('../utils/views')
const stateService = require('../services/state_service')
const paths = require('../paths')
const withAnalyticsError = require('../utils/analytics').withAnalyticsError

module.exports = (req, res, next) => {
  const correctStates = stateService.resolveStates(req.actionName)
  const currentState = req.chargeData.status
  if (!correctStates.includes(currentState)) {
    const stateName = currentState.toUpperCase().replace(/\s/g, '_')
    views.display(req, res, stateName, {
      chargeId: req.chargeId,
      returnUrl: paths.generateRoute('card.return', {chargeId: req.chargeId}),
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
      'path': paths.generateRoute(`card.new`, {chargeId: req.chargeId}),
      'analyticsId': gatewayAccount.analytics_id,
      'type': gatewayAccount.type,
      'paymentProvider': gatewayAccount.payment_provider
    }
  }
  return withAnalyticsError().analytics
}
