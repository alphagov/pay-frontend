'use strict'

// npm dependencies
const logger = require('winston')

// local dependencies
const views = require('../utils/views.js')
const CORRELATION_HEADER = require('../utils/correlation_header.js').CORRELATION_HEADER
const withAnalyticsError = require('../utils/analytics.js').withAnalyticsError
const getAdminUsersClient = require('../services/clients/adminusers_client')

module.exports = (req, res, next) => {
  if (!req.chargeId && !req.chargeData) {
    views.display(res, 'UNAUTHORISED', withAnalyticsError())
  } else {
    return getAdminUsersClient({correlationId: req.headers[CORRELATION_HEADER]})
      .findServiceBy({gatewayAccountId: req.chargeData.gateway_account.gateway_account_id})
      .then(service => {
        res.locals.service = service
        next()
      })
      .catch(() => {
        logger.error(`Failed to retrieve service information for service: ${req.chargeData.gateway_account.serviceName}`)
        next()
      })
  }
}
