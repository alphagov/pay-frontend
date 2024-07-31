'use strict'

// NPM dependencies
const csrf = require('csrf')

// Local dependencies
const logger = require('../utils/logger')(__filename)
const { getLoggingFields } = require('../utils/logging-fields-helper')
const session = require('../utils/session')
const responseRouter = require('../utils/response-router')
const cookies = require('../utils/cookies')

exports.csrfSetSecret = (req, _, next) => {
  const csrfSecret = cookies.getSessionCsrfSecret(req)
  if (!csrfSecret) {
    logger.info('Setting CSRF secret for session')
    cookies.setSessionVariable(req, 'csrfSecret', csrf().secretSync())
  }
  next()
}

exports.csrfTokenGeneration = (req, res, next) => {
  const csrfSecret = cookies.getSessionCsrfSecret(req)
  res.locals.csrf = csrf().create(csrfSecret)
  next()
}

exports.csrfCheck = (req, res, next) => {
  const chargeId = fetchAndValidateChargeId(req)
  if (!chargeId) {
    return responseRouter.response(req, res, 'UNAUTHORISED')
  }

  const chargeSession = session.retrieve(req, chargeId) || {} // TODO: remove after PP-12546 has been merged
  const sessionCsrfSecret = cookies.getSessionCsrfSecret(req)
  const csrfToken = req.body.csrfToken

  if (!chargeSession.csrfSecret && !sessionCsrfSecret) {
    responseRouter.response(req, res, 'UNAUTHORISED')
    logger.warn('CSRF secret is not defined', {
      ...getLoggingFields(req),
      referrer: req.get('Referrer'),
      url: req.originalUrl,
      method: req.method
    })
  } else if (!csrfValid(csrfToken, chargeSession.csrfSecret, req) && !csrfValid(csrfToken, sessionCsrfSecret, req)) {
    responseRouter.systemErrorResponse(req, res, 'CSRF is invalid')
  } else {
    next()
  }
}

function fetchAndValidateChargeId (req) {
  if (session.validateSessionCookie(req)) {
    return req.params.chargeId ? req.params.chargeId : req.body.chargeId
  }
  return false
}

function csrfValid (csrfToken, secret, req) {
  if (!secret) {
    return false
  }
  if (!['put', 'post'].includes(req.method.toLowerCase())) {
    return true
  } else {
    return csrf().verify(secret, csrfToken)
  }
}
