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
    client.delete(createUrl('token', {chargeTokenId: tokenId}), function(data,response){
      if (response.statusCode !== 204) {
        return defer.reject(new Error('DELETE_FAILED'));
      }
      defer.resolve(data);
    }).on('error',function(err){

      logger.error('Exception raised calling connector for del: ' + err);
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
