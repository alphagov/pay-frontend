var csrf = require('csrf')
var session = require('../utils/session.js')
var views = require('../utils/views.js')
var chargeParam = require('../services/charge_param_retriever.js')
var logger = require('pino')
var _views = views.create()

var csrfTokenGeneration = function (req, res, next) {
  'use strict'
  var chargeId = chargeParam.retrieve(req)
  var chargeSession = session.retrieve(req, chargeId)

  var init = function () {
    appendCsrf()
    next()
  }

  var appendCsrf = function () {
    res.locals.csrf = csrf().create(chargeSession.csrfSecret)
  }

  init()
}

var csrfCheck = function (req, res, next) {
  'use strict'

  var chargeId = chargeParam.retrieve(req)
  var chargeSession = session.retrieve(req, chargeId)
  var csrfToken = req.body.csrfToken

  var init = function () {
    if (!sessionAvailable()) return showNoSession()
    if (!csrfValid()) return showCsrfInvalid()
    next()
  }

  var sessionAvailable = function () {
    return chargeSession && chargeSession.csrfSecret
  }

  var showNoSession = function () {
    _views.display(res, 'UNAUTHORISED')
    return logger.error('CSRF secret is not defined')
  }

  var csrfValid = function () {
    if (!(req.route.methods.post || req.route.methods.put)) return true
    if (!chargeSession.csrfTokens) chargeSession.csrfTokens = []

    if (csrfUsed()) {
      logger.error('CSRF token was already used')
      return false
    }
    var verify = csrf().verify(chargeSession.csrfSecret, csrfToken)
    if (verify === false) return false

    chargeSession.csrfTokens.push(csrfToken)
    return true
  }

  var csrfUsed = function () {
    return chargeSession.csrfTokens.indexOf(csrfToken) !== -1
  }

  var showCsrfInvalid = function () {
    _views.display(res, 'SYSTEM_ERROR')
    return logger.error('CSRF is invalid')
  }

  init()
}

module.exports = {
  csrfCheck: csrfCheck,
  csrfTokenGeneration: csrfTokenGeneration
}
