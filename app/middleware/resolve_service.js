const views = require('../utils/views.js')
const CORRELATION_HEADER = require('../utils/correlation_header.js').CORRELATION_HEADER
const withAnalyticsError = require('../utils/analytics.js').withAnalyticsError
const getAdminUsersClient = require('../services/clients/adminusers_client')

module.exports = function (req, res, next) {
  'use strict'
  const _views = views.create()

  if (!req.chargeId && !req.chargeData) {
    _views.display(res, 'UNAUTHORISED', withAnalyticsError())
  } else {
    let correlationId = req.headers[CORRELATION_HEADER]
    return getAdminUsersClient({correlationId: correlationId}).findServiceBy({gatewayAccountId: req.chargeData.gateway_account.gateway_account_id})
      .then(function handleAdminUsersClient (service) {
        res.locals.service = service
        next()
      })
      .catch(() => {
        _views.display(res, 'SYSTEM_ERROR', withAnalyticsError())
      })
  }
}
