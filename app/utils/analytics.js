'use strict'

// NPM dependencies
const lodash = require('lodash')

// Local dependencies
const paths = require('../paths.js')

// Constants
const ANALYTICS_ERROR = {
  analytics: {
    analyticsId: 'Service unavailable',
    type: 'Service unavailable',
    paymentProvider: 'Service unavailable',
    amount: '0.00'
  }
}

exports.withAnalyticsError = () => lodash.clone(ANALYTICS_ERROR)
exports.withAnalytics = (charge, param, path) => {
  return lodash.merge({
    analytics: {
      path: path || paths.generateRoute(`card.new`, {chargeId: charge.id}),
      analyticsId: charge.gatewayAccount.analyticsId,
      type: charge.gatewayAccount.type,
      paymentProvider: charge.gatewayAccount.paymentProvider,
      amount: charge.amount,
      testingVariant: 'original'
    }}, param)
}
