'use strict'

// NPM dependencies
const { Cache } = require('memory-cache')
const lodash = require('lodash')

// Local dependencies
const logger = require('../utils/logger')(__filename)
const { getLoggingFields } = require('../utils/logging-fields-helper')
const responseRouter = require('../utils/response-router')
const { CORRELATION_HEADER } = require('../../config/correlation-header')
const { withAnalyticsError } = require('../utils/analytics')
const getAdminUsersClient = require('../services/clients/adminusers.client')

// Constants
const SERVICE_CACHE_MAX_AGE = parseInt(process.env.SERVICE_CACHE_MAX_AGE || 15 * 60 * 1000) // default to 15 mins
const serviceCache = new Cache()

// @FIXME(sfount) we should NOT return directly from this middleware if something
//                is an issue in favour of correctly passing an new Error object
//                through to `next`
module.exports = function resolveServiceMiddleware (req, res, next) {
  const gatewayAccountId = lodash.get(req, 'chargeData.gateway_account.gateway_account_id')
  if (!req.chargeId && !req.chargeData) return responseRouter.response(req, res, 'UNAUTHORISED', withAnalyticsError())
  const cachedService = serviceCache.get(gatewayAccountId)
  if (cachedService) {
    res.locals.service = cachedService
    res.locals.collectBillingAddress = res.locals.service.collectBillingAddress && !req.chargeData.moto
    next()
  } else {
    // @FIXME(sfount) tests shouldn't rely on middleware returning a value if
    //                it is not used by the middleware stack - revisit this structure
    return getAdminUsersClient({ correlationId: req.headers[CORRELATION_HEADER] })
      .findServiceBy({ gatewayAccountId }, getLoggingFields(req))
      .then(service => {
        serviceCache.put(gatewayAccountId, service, SERVICE_CACHE_MAX_AGE)
        res.locals.service = service
        res.locals.collectBillingAddress = res.locals.service.collectBillingAddress && !req.chargeData.moto
        next()
      })
      .catch((err) => {
        logger.error(`Failed to retrieve service information for service: ${req.chargeData.gateway_account.serviceName}`, {
          ...getLoggingFields(req),
          error: err
        })
        next()
      })
  }
}
