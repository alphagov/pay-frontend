const views = require('../utils/views.js');
const Charge = require('../models/charge.js');
const chargeParam = require('../services/charge_param_retriever.js');
const CORRELATION_HEADER = require('../utils/correlation_header.js').CORRELATION_HEADER;
const withAnalyticsError = require('../utils/analytics.js').withAnalyticsError;

module.exports = function(req, res, next){
  "use strict";
  const _views = views.create();
  const chargeId = chargeParam.retrieve(req);

  if (!chargeId) {
    _views.display(res,"UNAUTHORISED", withAnalyticsError());
  } else {
    req.chargeId = chargeId;
    Charge(req.headers[CORRELATION_HEADER]).find(chargeId)
      .then(data => {
        req.chargeData = data;
        next();
      })
      .catch(() => {
        _views.display(res,"SYSTEM_ERROR", withAnalyticsError());
      });
  }

};
