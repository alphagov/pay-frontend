const _ = require('lodash')
const paths = require('../paths.js')

const ANALYTICS_ERROR = {
  analytics: {
    analyticsId: 'Service unavailable',
    type: 'Service unavailable',
    paymentProvider: 'Service unavailable'
  }
}

function withAnalytics (charge, param) {
  return _.merge(
    {
      analytics: {
        path: paths.generateRoute('card.new', {chargeId: charge.id}),
        analyticsId: charge.gatewayAccount.analyticsId,
        type: charge.gatewayAccount.type,
        paymentProvider: charge.gatewayAccount.paymentProvider
      }}, param)
}

function withError () {
  return _.clone(ANALYTICS_ERROR)
}

module.exports = {
  withAnalyticsError: withError,
  withAnalytics: withAnalytics
}
