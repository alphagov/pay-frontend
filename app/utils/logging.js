/*jslint node: true */
"use strict";
var logger = require('winston');
module.exports = {

  authChargePost: function(url){
    logger.debug("Calling connector to authorize a charge (post card details) -", {
      service: 'connector',
      method: 'POST',
      url: url
    });
  },
  failedChargePost: function(status,url){
    logger.warn('Calling connector to authorize a charge (post card details) failed -', {
      service: 'connector',
      method: 'POST',
      status: status,
      url: url
    });
  },

  failedChargePostException: function(err){
    logger.error('Calling connector to authorize a charge (post card details) threw exception -', {
      service: 'connector',
      method: 'POST',
      error: err
    });
  },
  failedChargePatch: function(err){
    logger.warn('Calling connector to patch a charge failed -', {
      service: 'connector',
      method: 'POST',
      err: err
    });
  }
};
