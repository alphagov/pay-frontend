var views = require('../utils/views.js')
var _views = views.create({})
var _ = require('lodash')
var stateService = require('../services/state_service.js')
var paths = require('../paths.js')

var withAnalyticsError = require('../utils/analytics.js').withAnalyticsError
module.exports = function (req, res, next) {
  'use strict'

  function getGoogleAnalytics () {
    var gatewayAccount = _.get(req, 'chargeData.gateway_account')
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

  var correctStates = stateService.resolveStates(req.actionName)
  var currentState = req.chargeData.status
  var locals = {
    chargeId: req.chargeId,
    returnUrl: paths.generateRoute('card.return', {chargeId: req.chargeId}),
    analytics: getGoogleAnalytics()
  }

  var init = function () {
    if (!stateCorrect()) return
    next()
  }

  var stateCorrect = function () {
    var chargeOK = ischargeSessionOK()
    if (!chargeOK) {
      var stateName = currentState.toUpperCase().replace(/\s/g, '_')
      _views.display(res, stateName, locals)
      return false
    }
    return true
  }

  var ischargeSessionOK = function () {
    return _.includes(correctStates, currentState)
  }

  return init()
}
