var Client  = require('node-rest-client').Client;
var client  = new Client();
var q       = require('q');
var logger  = require('winston');
var paths   = require('../paths.js');

module.exports = function() {
  'use strict';

  var createUrl = function(resource,params){
        return paths.generateRoute(`connectorCharge.${resource}`,params);
      },

  destroy = function(tokenId){
    var defer = q.defer();
    logger.debug('Calling connector to delete a token -', {
      service: 'connector',
      method: 'DELETE',
      url: createUrl('token', {chargeTokenId: '{tokenId}'})
    });
    client.delete(createUrl('token', {chargeTokenId: tokenId}), function(data,response){
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
      logger.error('Calling connector to delete a token threw exception -', {
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
}();
