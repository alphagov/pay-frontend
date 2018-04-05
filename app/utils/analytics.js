'use strict'

// npm dependencies
const lodash = require('lodash')

// local dependencies
const paths = require('../paths.js')

// constants
const ANALYTICS_ERROR = {
  analytics: {
    analyticsId: 'Service unavailable',
    type: 'Service unavailable',
    paymentProvider: 'Service unavailable',
    amount: '0.00'
  }
}

exports.withAnalyticsError = () => lodash.clone(ANALYTICS_ERROR)
exports.withAnalytics = (charge, param) => {
  return lodash.merge({
    analytics: {
      path: paths.generateRoute(`card.new`, {chargeId: charge.id}),
      analyticsId: charge.gatewayAccount.analyticsId,
      type: charge.gatewayAccount.type,
      paymentProvider: charge.gatewayAccount.paymentProvider,
      amount: charge.amount,
      testingVariant: 'original'
    }}, param)
}
