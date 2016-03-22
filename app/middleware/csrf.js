"use strict";
var csrf    = require('csrf'),
session     = require('../utils/session.js'),
views       = require('../utils/views.js'),
chargeParam = require('../services/charge_param_retriever.js'),
_views      = views.create();

module.exports = function(req, res, next){
 var chargeId   = chargeParam.retrieve(req),
 chargeSession  = session(req, chargeId),
 csrfToken      = req.body.csrfToken;

  var init = function(){
    if (!sessionAvailable()) return showNoSession();
    if (!csrfValid()) return showCsrfInvalid();

    appendCsrf();
    next();
  },

  sessionAvailable = function(){
    return chargeSession && chargeSession.csrfSecret;
  },

  showNoSession = function(){
    _views.display(res,'SYSTEM_ERROR');
    return console.error('CSRF SECRET IS NOT DEFINED');
  },

  csrfValid = function(){
    if (!(req.route.methods.post || req.route.methods.put)) return true;
    if (!chargeSession.csrfTokens) chargeSession.csrfTokens = [];

    if(csrfUsed()) {
      console.error('CSRF USED');
      return false;
    }

    chargeSession.csrfTokens.push(csrfToken);
    return csrf().verify(chargeSession.csrfSecret, csrfToken);
  },

  csrfUsed = function(){
    return chargeSession.csrfTokens.indexOf(csrfToken) !== -1;
  },

  showCsrfInvalid = function(){
    _views.display(res,'SYSTEM_ERROR');
    return console.error('CSRF INVALID');
  },

  appendCsrf = function(){
    res.locals.csrf = csrf().create(chargeSession.csrfSecret);
  };

  init();
};
