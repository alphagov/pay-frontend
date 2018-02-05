var _ = require('lodash')
var paths = require('../paths.js')

const ANALYTICS_ERROR = {
  analytics: {
    analyticsId: 'Service unavailable',
    type: 'Service unavailable',
    paymentProvider: 'Service unavailable',
    amount: '0.00'
  }
}

module.exports = (function () {
  'use strict'

  var withAnalytics = function (charge, param) {
    return _.merge(
      {
        analytics: {
          path: paths.generateRoute(`card.new`, {chargeId: charge.id}),
          analyticsId: charge.gatewayAccount.analyticsId,
          type: charge.gatewayAccount.type,
          paymentProvider: charge.gatewayAccount.paymentProvider,
          amount: charge.amount
        }}, param)
  }
  var withError = function () {
    return _.clone(ANALYTICS_ERROR)
  }
  return {
    withAnalyticsError: withError,
    withAnalytics: withAnalytics
  }
}())
