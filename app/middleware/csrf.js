var csrf    = require('csrf'),
session     = require('../utils/session.js'),
views       = require('../utils/views.js'),
chargeParam = require('../services/charge_param_retriever.js'),
logger      = require('winston'),
_views      = views.create();

module.exports = function(req, res, next) {
  "use strict";

  var chargeId   = chargeParam.retrieve(req),
  chargeSession  = session.retrieve(req, chargeId),
  csrfToken      = req.body.csrfToken;

  var init = function() {
    if (!sessionAvailable()) return showNoSession();
    if (!csrfValid()) return showCsrfInvalid();

    appendCsrf();
    next();
  },

  sessionAvailable = function(){
    return chargeSession && chargeSession.csrfSecret;
  },

  showNoSession = function(){
    _views.display(res,'UNAUTHORISED');
    return logger.error('CSRF secret is not defined');
  },

  csrfValid = function(){
    if (!(req.route.methods.post || req.route.methods.put)) return true;
    if (!chargeSession.csrfTokens) chargeSession.csrfTokens = [];

    if(csrfUsed()) {
      logger.error('CSRF token was already used');
      return false;
    }
    var verify = csrf().verify(chargeSession.csrfSecret, csrfToken);
    if (verify === false) return false;

    chargeSession.csrfTokens.push(csrfToken);
    return true;
  },

  csrfUsed = function(){
    return chargeSession.csrfTokens.indexOf(csrfToken) !== -1;
  },

  showCsrfInvalid = function(){
    _views.display(res,'SYSTEM_ERROR');
    return logger.error('CSRF is invalid');
  },

  appendCsrf = function(){
    res.locals.csrf = csrf().create(chargeSession.csrfSecret);
  };

  init();
};
