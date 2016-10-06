var Charge = require('../models/charge.js'),
  StateModel = require('../models/state.js'),
  views = require('../utils/views.js'),
  CORRELATION_HEADER = require('../utils/correlation_header.js').CORRELATION_HEADER;

var logger = require('winston');

module.exports.return = function (req, res) {
  'use strict';

  var correlationId = req.headers[CORRELATION_HEADER] || '',
   _views = views.create({}),
  doRedirect = () => res.redirect(req.chargeData.return_url),
  chargeModel = Charge(correlationId),
  
  cancelStates = [
    StateModel.CREATED, 
    StateModel.ENTERING_CARD_DETAILS,
    StateModel.AUTH_SUCCESS,
    StateModel.AUTH_READY,
    StateModel.CAPTURE_READY
  ];

  if (cancelStates.indexOf(req.chargeData.status) === -1) return doRedirect();
  
  logger.warn('Return controller cancelling payment', {'chargeId': req.chargeId});
  chargeModel.cancel(req.chargeId).then(doRedirect, ()=> _views.display(res, 'SYSTEM_ERROR'));
};