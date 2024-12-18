const logger = require('../utils/logger')(__filename)
const session = require('../utils/session')
const responseRouter = require('../utils/response-router')
const cookies = require('../utils/cookies')
const { configureCsrfMiddleware } = require('@govuk-pay/pay-js-commons/lib/utils/middleware/csrf.middleware')

const csrfMiddleware = configureCsrfMiddleware(logger, cookies.getSessionCookieName(), 'csrfSecret', 'csrfToken')

exports.setSecret = csrfMiddleware.setSecret

exports.generateToken = csrfMiddleware.generateToken

exports.checkToken = [checkToken, handleCsrfError]

function checkToken (req, res, next) {
  const chargeId = fetchAndValidateChargeId(req)
  if (!chargeId) {
    return responseRouter.response(req, res, 'UNAUTHORISED')
  }
  csrfMiddleware.checkToken(req, res, next)
}

function handleCsrfError (err, req, res, next) {
  if (err && err.name === 'CsrfError') {
    if (err.message.toLowerCase().includes('csrf secret was not found')) {
      return responseRouter.response(req, res, 'UNAUTHORISED')
    } else {
      return responseRouter.systemErrorResponse(req, res, 'CSRF is invalid')
    }
  }
  next(err)
}

function fetchAndValidateChargeId (req) {
  if (session.validateSessionCookie(req)) {
    return req.params.chargeId ? req.params.chargeId : req.body.chargeId
  }
  return false
}
