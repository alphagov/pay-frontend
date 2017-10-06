const csrf = require('csrf')
const session = require('../utils/session.js')
const views = require('../utils/views.js')
const chargeParam = require('../services/charge_param_retriever.js')
const logger = require('pino')()
const _views = views.create()

function csrfTokenGeneration (req, res, next) {
  const chargeId = chargeParam.retrieve(req)
  const chargeSession = session.retrieve(req, chargeId)
  res.locals.csrf = csrf().create(chargeSession.csrfSecret)
  next()
}

function csrfCheck (req, res, next) {
  const chargeId = chargeParam.retrieve(req)
  const chargeSession = session.retrieve(req, chargeId)
  const csrfToken = req.body.csrfToken

  if (!sessionAvailable(chargeSession)) return showNoSession(res)
  if (!csrfValid(req, chargeSession, csrfToken)) return showCsrfInvalid(res)
  next()
}

function sessionAvailable (chargeSession) {
  return chargeSession && chargeSession.csrfSecret
}

function showNoSession (res) {
  _views.display(res, 'UNAUTHORISED')
  return logger.error('CSRF secret is not defined')
}

function csrfValid (req, chargeSession, csrfToken) {
  if (!(req.route.methods.post || req.route.methods.put)) return true
  if (!chargeSession.csrfTokens) chargeSession.csrfTokens = []

  if (csrfUsed(chargeSession, csrfToken)) {
    logger.error('CSRF token was already used')
    return false
  }
  const verify = csrf().verify(chargeSession.csrfSecret, csrfToken)
  if (verify === false) return false

  chargeSession.csrfTokens.push(csrfToken)
  return true
}

function csrfUsed (chargeSession, csrfToken) {
  return chargeSession.csrfTokens.indexOf(csrfToken) !== -1
}

function showCsrfInvalid (res) {
  _views.display(res, 'SYSTEM_ERROR')
  return logger.error('CSRF is invalid')
}

module.exports = {
  csrfCheck: csrfCheck,
  csrfTokenGeneration: csrfTokenGeneration
}
