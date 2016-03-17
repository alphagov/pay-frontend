var views         = require('../utils/views.js');
var Charge        = require('../models/charge.js');
var chargeParam   = require('../services/charge_param_retriever.js');
var normalise     = require('../services/normalise_charge.js');
var q             = require('q');

module.exports = function(req, res, next){
  var _views  = views.create(),
  chargeId    = req.chargeId,
  defer       = q.defer();

  var init = function(){
    var chargeId = chargeParam.retrieve(req);
    if (!chargeId) return _views.display(res,"NOT_FOUND");
    req.chargeId = chargeId;

    Charge.find(chargeId).then(gotCharge, apiFail);
  },

  gotCharge = function(data){
    req.chargeData = data;
    next();
  },

  apiFail = function(error){
    _views.display(res,"NOT_FOUND");
  };

  init();

  return defer.promise
};
