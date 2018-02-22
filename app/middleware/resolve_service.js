'use strict'

// npm dependencies
const logger = require('winston')
const {Cache} = require('memory-cache')
const lodash = require('lodash')

// local dependencies
const views = require('../utils/views.js')
const CORRELATION_HEADER = require('../utils/correlation_header.js').CORRELATION_HEADER
const withAnalyticsError = require('../utils/analytics.js').withAnalyticsError
const getAdminUsersClient = require('../services/clients/adminusers_client')

// constants
const SERVICE_CACHE_MAX_AGE = parseInt(process.env.SERVICE_CACHE_MAX_AGE || 15 * 60 * 1000) // default to 15 mins
const serviceCache = new Cache()

module.exports = (req, res, next) => {
  const gatewayAccountId = lodash.get(req, 'chargeData.gateway_account.gateway_account_id')
  if (!req.chargeId && !req.chargeData) return views.display(res, 'UNAUTHORISED', withAnalyticsError())
  const cachedService = serviceCache.get(gatewayAccountId)
  if (cachedService) {
    res.locals.service = cachedService
    next()
  } else {
    return getAdminUsersClient({correlationId: req.headers[CORRELATION_HEADER]})
      .findServiceBy({gatewayAccountId})
      .then(service => {
        serviceCache.put(gatewayAccountId, service, SERVICE_CACHE_MAX_AGE)
        res.locals.service = service
        next()
      })
      .catch(() => {
        logger.error(`Failed to retrieve service information for service: ${req.chargeData.gateway_account.serviceName}`)
        next()
      })
  }
}
