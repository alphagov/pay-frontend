var logger = require('winston');

module.exports = function(){

  var retrieve = function(req) {
    var chargeId = getChargeParam(req);

    if (!chargeId) {
      logger.error('Unexpected: chargeId was not found in request.');
      return false;
    }

    if (!getChargeFromSession(req, chargeId)) {
      logger.error('Unexpected: chargeId=' + chargeId + ' could not be found on the session');
      return false;
    }
    return chargeId;
  },

  getChargeParam = function(req) {
    return (req.method == "GET") ? req.params.chargeId : req.body.chargeId;
  },

  getChargeFromSession = function(req,chargeId) {
    if (!req.frontend_state) return;
    return req.frontend_state[createChargeIdSessionKey(chargeId)];
  },

  createChargeIdSessionKey = function(chargeId) {
    return 'ch_' + chargeId;
  }

  return {
    retrieve: retrieve
  }

}()
