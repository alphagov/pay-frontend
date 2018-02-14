'use strict'

// npm dependencies
const logger = require('winston')

// local dependencies
const views = require('../utils/views.js')
const CORRELATION_HEADER = require('../utils/correlation_header.js').CORRELATION_HEADER
const session = require('../utils/session.js')
const {setSessionVariable} = require('../utils/cookies')
const withAnalyticsError = require('../utils/analytics.js').withAnalyticsError
const getAdminUsersClient = require('../services/clients/adminusers_client')

module.exports = (req, res, next) => {
  if (!req.chargeId && !req.chargeData) return views.display(res, 'UNAUTHORISED', withAnalyticsError())
  const chargeSession = session.retrieve(req, req.chargeId) || {}
  if (chargeSession.service) {
    res.locals.service = chargeSession.service
    next()
  } else {
    return getAdminUsersClient({correlationId: req.headers[CORRELATION_HEADER]})
      .findServiceBy({gatewayAccountId: req.chargeData.gateway_account.gateway_account_id})
      .then(service => {
        setSessionVariable(req, session.createChargeIdSessionKey(req.chargeId), {service})
        res.locals.service = service
        next()
      })
      .catch(() => {
        logger.error(`Failed to retrieve service information for service: ${req.chargeData.gateway_account.serviceName}`)
        next()
      })
  }
}
