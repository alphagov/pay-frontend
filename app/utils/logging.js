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
  }



};
