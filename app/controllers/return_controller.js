var Charge = require('../models/charge.js'),
  StateModel = require('../models/state.js'),
  views = require('../utils/views.js'),
  CORRELATION_HEADER = require('../utils/correlation_header.js').CORRELATION_HEADER,
  withAnalyticsError = require('../utils/analytics.js').withAnalyticsError;

var logger = require('winston');

let CANCELABLE_STATES = [
  StateModel.CREATED,
  StateModel.ENTERING_CARD_DETAILS,
  StateModel.AUTH_SUCCESS,
  StateModel.AUTH_READY,
  StateModel.CAPTURE_READY,
  StateModel.AUTH_3DS_REQUIRED,
  StateModel.AUTH_3DS_READY
];

module.exports.return = function (req, res) {
  'use strict';

  let correlationId = req.headers[CORRELATION_HEADER] || '',
   _views = views.create({}),
  doRedirect = () => res.redirect(req.chargeData.return_url),
  chargeModel = Charge(correlationId);

  if (CANCELABLE_STATES.includes(req.chargeData.status)) {
    chargeModel.cancel(req.chargeId).then(
      () => logger.warn('Return controller cancelled payment', {'chargeId': req.chargeId}),
      () => _views.display(res, 'SYSTEM_ERROR', withAnalyticsError()));
  }
    doRedirect();
};