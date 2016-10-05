var Charge = require('../models/charge.js'),
  StateModel = require('../models/state.js'),
  views = require('../utils/views.js'),
  CORRELATION_HEADER = require('../utils/correlation_header.js').CORRELATION_HEADER;

module.exports.return = function (req, res) {
  'use strict';

  var correlationId = req.headers[CORRELATION_HEADER] || '',
   _views = views.create({}),
  doRedirect = () => res.redirect(req.chargeData.service_return_url),
  chargeModel = Charge(correlationId),
  cancelStates = [
    StateModel.CREATED, 
    StateModel.ENTERING_CARD_DETAILS,
    StateModel.AUTH_SUCCESS,
    StateModel.AUTH_READY,
    StateModel.CAPTURE_READY
  ];

  if (cancelStates.indexOf(req.chargeData.status) === -1) return doRedirect();
  chargeModel.cancel(req.chargeId).then(doRedirect, ()=> _views.display(res, 'SYSTEM_ERROR'));

};
