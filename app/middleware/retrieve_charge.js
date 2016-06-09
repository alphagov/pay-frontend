var views         = require('../utils/views.js');
var Charge        = require('../models/charge.js');
var chargeParam   = require('../services/charge_param_retriever.js');
var q             = require('q');

module.exports = function(req, res, next){
  "use strict";
  var _views  = views.create(),
  defer       = q.defer();

  var init = function(){
    var chargeId = chargeParam.retrieve(req);
    if (!chargeId) return _views.display(res,"UNAUTHORISED");
    req.chargeId = chargeId;
    Charge.find(chargeId).then(gotCharge, apiFail);
  },

  gotCharge = function(data){
    req.chargeData = data;
    next();
  },

  apiFail = function(){
    _views.display(res,"SYSTEM_ERROR");
  };

  init();

  return defer.promise;
};
