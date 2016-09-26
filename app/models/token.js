var Client  = require('node-rest-client').Client;
var client  = new Client();
var q       = require('q');
var logger  = require('winston');
var paths   = require('../paths.js');
var withCorrelationHeader = require(__dirname + '/../utils/correlation_header.js').withCorrelationHeader;

module.exports = function(correlationId) {
  'use strict';

  var createUrl = function(resource,params){
        return paths.generateRoute(`connectorCharge.${resource}`,params);
      },

  destroy = function(tokenId){
    var defer = q.defer();
    logger.debug('[%s] Calling connector to delete a token -', correlationId, {
      service: 'connector',
      method: 'DELETE',
      url: createUrl('token', {chargeTokenId: '{tokenId}'})
    });

    var startTime = new Date();
    var deleteUrl = createUrl('token', {chargeTokenId: tokenId});
    var args = {};

    client.delete(deleteUrl, withCorrelationHeader(args, correlationId), function(data, response){
      logger.info('[%s] - %s to %s ended - total time %dms', 'DELETE',
        correlationId, deleteUrl, new Date() - startTime);

      if (response.statusCode !== 204) {
        logger.warn('Calling connector to delete a token failed -', {
          service: 'connector',
          method: 'DELETE',
          url: createUrl('token', {chargeTokenId: '{tokenId}'})
        });
        return defer.reject(new Error('DELETE_FAILED'));
      }
      defer.resolve(data);
    }).on('error',function(err){
      logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'DELETE', deleteUrl, new Date() - startTime);
      logger.error('[%s] Calling connector to delete a token threw exception -', correlationId, {
        service: 'connector',
        method: 'DELETE',
        url: createUrl('token', {chargeTokenId: '{tokenId}'}),
        error: err
      });
      clientUnavailable(err, defer);
    });
    return defer.promise;
  },

  clientUnavailable = function(error, defer) {
    defer.reject(new Error('CLIENT_UNAVAILABLE'),error);
  };

  return {
    destroy: destroy
  };
};
