'use strict'

const csrf = require('csrf')
const session = require('../utils/session.js')
const views = require('../utils/views.js')
const chargeParam = require('../services/charge_param_retriever.js')
const logger = require('winston')
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
    views.display(res, 'UNAUTHORISED')
    logger.error('CSRF secret is not defined')
  } else if (!csrfValid(csrfToken, chargeSession, req)) {
    views.display(res, 'SYSTEM_ERROR')
    logger.error('CSRF is invalid')
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
