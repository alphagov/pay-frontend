var hashCardNumber  = require('../utils/charge_utils.js').hashOutCardNumber;
var normalise       = require('../services/normalise_charge.js');

module.exports = function() {
  'use strict';

  var createChargeIdSessionKey = function(chargeId) {
    return 'ch_' + chargeId;
  },

  retrieve = function(req, chargeId) {
    return req.frontend_state[createChargeIdSessionKey(chargeId)];
  },

  store = function(req) {
    var chargeSession  = retrieve(req, req.chargeId);
    var plainCardNumber = normalise.creditCard(req.body.cardNo);
    var expiryDate = normalise.expiryDate(req.body.expiryMonth, req.body.expiryYear);

    chargeSession.cardNumber = hashCardNumber(plainCardNumber);
    chargeSession.expiryDate = expiryDate;
    chargeSession.cardholderName = req.body.cardholderName;
    chargeSession.address = normalise.addressForView(req.body);
  };

  return {
    retrieve: retrieve,
    createChargeIdSessionKey: createChargeIdSessionKey,
    store: store
  };
}();
