var views         = require('../utils/views.js');
var Charge        = require('../models/charge.js');
var chargeParam   = require('../services/charge_param_retriever.js');
var q             = require('q');
var CORRELATION_HEADER = require('../utils/correlation_header.js').CORRELATION_HEADER;
var ANALYTICS_ERROR = require('../utils/analytics.js').ANALYTICS_ERROR;

module.exports = function(req, res, next){
  "use strict";
  var _views  = views.create(),
  defer       = q.defer();

  var init = function(){
    var chargeId = chargeParam.retrieve(req);
    if (!chargeId) return _views.display(res,"UNAUTHORISED", ANALYTICS_ERROR);
    req.chargeId = chargeId;
    var chargeModel = Charge(req.headers[CORRELATION_HEADER]);
    chargeModel.find(chargeId).then(gotCharge, apiFail);
  },

  gotCharge = function(data){
    req.chargeData = data;
    next();
  },

  apiFail = function(){
    _views.display(res,"SYSTEM_ERROR", ANALYTICS_ERROR);
  };

  init();

  return defer.promise;
};
