const _ = require('lodash')

const views = require('../utils/views.js')
const _views = views.create({})
const stateService = require('../services/state_service.js')
const paths = require('../paths.js')
const withAnalyticsError = require('../utils/analytics.js').withAnalyticsError

function stateCorrect (correctStates, currentState, locals, res) {
  const chargeOK = ischargeSessionOK(correctStates, currentState)
  if (!chargeOK) {
    const stateName = currentState.toUpperCase().replace(/\s/g, '_')
    _views.display(res, stateName, locals)
    return false
  }
  return true
}

function ischargeSessionOK (correctStates, currentState) {
  return _.includes(correctStates, currentState)
}

function getGoogleAnalytics (req) {
  const gatewayAccount = _.get(req, 'chargeData.gateway_account')
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

module.exports = function (req, res, next) {
  const correctStates = stateService.resolveStates(req.actionName)
  const currentState = req.chargeData.status
  const locals = {
    chargeId: req.chargeId,
    returnUrl: paths.generateRoute('card.return', {chargeId: req.chargeId}),
    analytics: getGoogleAnalytics(req)
  }
  if (!stateCorrect(correctStates, currentState, locals, res)) return
  next()
}
