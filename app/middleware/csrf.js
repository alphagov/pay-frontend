'use strict'

// NPM dependencies
const csrf = require('csrf')

// Local dependencies
const logger = require('../utils/logger')(__filename)
const logging = require('../utils/logging')
const session = require('../utils/session')
const responseRouter = require('../utils/response_router')
const chargeParam = require('../services/charge_param_retriever')
const { CORRELATION_HEADER } = require('../../config/correlation_header')

exports.csrfTokenGeneration = (req, res, next) => {
  const chargeId = chargeParam.retrieve(req)
  const chargeSession = session.retrieve(req, chargeId)
  res.locals.csrf = csrf().create(chargeSession.csrfSecret)
  next()
}

exports.csrfCheck = (req, res, next) => {
  const chargeId = chargeParam.retrieve(req)
  const chargeSession = session.retrieve(req, chargeId) || {}
  const csrfToken = req.body.csrfToken
  chargeSession.csrfTokens = chargeSession.csrfTokens || []

  if (!chargeSession.csrfSecret) {
    responseRouter.response(req, res, 'UNAUTHORISED')
    logger.error('CSRF secret is not defined')
  } else if (!csrfValid(csrfToken, chargeSession, req)) {
    logging.systemError('CSRF is invalid', req.headers && req.headers[CORRELATION_HEADER], chargeId)
    responseRouter.response(req, res, 'SYSTEM_ERROR')
  } else {
    chargeSession.csrfTokens.push(csrfToken)
    next()
  }
}

function csrfValid (csrfToken, chargeSession, req) {
  if (!['put', 'post'].includes(req.method.toLowerCase())) {
    return true
  } else if (chargeSession.csrfTokens.includes(csrfToken)) {
    logger.error('CSRF token was already used')
    return false
  } else {
    return csrf().verify(chargeSession.csrfSecret, csrfToken)
  }
}
