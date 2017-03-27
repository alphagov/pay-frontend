var _ = require('lodash');
var paths = require('../paths.js');

const ANALYTICS_ERROR = {
  analytics: {
    analyticsId: "Service unavailable",
    type: "Service unavailable",
    paymentProvider: "Service unavailable"
  }
};

module.exports = function () {
  'use strict';

  var withAnalytics = function(charge, param) {
      return _.merge(
        {
          analytics: {
            path: paths.generateRoute(`card.new`, {chargeId: charge.id }),
            analyticsId: charge.gatewayAccount.analyticsId,
            type: charge.gatewayAccount.type,
            paymentProvider: charge.gatewayAccount.paymentProvider
          }}, param);
    },
    withError = function() {
      return _.clone(ANALYTICS_ERROR);
    };
  return {
    withAnalyticsError: withError,
    withAnalytics: withAnalytics
  };
}();

