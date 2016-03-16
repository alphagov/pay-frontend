var Client  = require('node-rest-client').Client;
var client  = new Client();
var _       = require('lodash');
var q       = require('q');
var logger  = require('winston');
var paths   = require('../paths.js');
var ENTERING_CARD_DETAILS_STATUS = 'ENTERING CARD DETAILS';



module.exports = function(){

  createUrl = function(resource,chargeId){
    return paths.generateRoute(paths.connectorCharge[resource].path,{chargeId: chargeId});
  },

  mergeApiParams = function(params){
    params = (params) ? params: {};
    var _default = {
      headers: {"Content-Type": "application/json"},
      data: {}
    };

    _default.data = _.merge(params,_default.data);
    return _default;
  },

  updateToEnterDetails = function(chargeId) {
    return updateStatus(chargeId,ENTERING_CARD_DETAILS_STATUS);
  },

  updateStatus = function(chargeId, status){
    var url = createUrl('updateStatus',chargeId),
    params  = mergeApiParams({new_status: status}),
    defer   = q.defer();

    client.put(url, params, function(data, response){
      updateComplete(chargeId, data, response, defer);
    }).on('error',function(err){
      clientUnavailable(err, defer);
    });

    return defer.promise;
  },

  find = function(chargeId){
    var defer = q.defer();
    client.get(createUrl('show',chargeId), function(data,response){

      if (response.statusCode !== 200) {
        return defer.reject(new Error('GET_FAILED'));
      }
      defer.resolve(data);
    }).on('error',function(err){

        logger.error('Exception raised calling connector for get: ' + err);
      clientUnavailable(err, defer);
    });
    return defer.promise;
  },

  capture = function(chargeId){
    var url = createUrl('capture',chargeId),
    params  = mergeApiParams(),
    defer   = q.defer();
    client.post(url, params, function(data, response){
      captureComplete(data, response, defer);
    })
    .on('error',function(err){ captureFail(err, defer); });

    return defer.promise;
  },

  captureComplete = function(data, response, defer) {
    var code = response.statusCode;
    if (code == 204) return defer.resolve();
    if (code == 400) return defer.reject(new Error('AUTH_FAILED'));
    return defer.reject(new Error('POST_FAILED'));
  },

  captureFail = function(err, defer){
    logger.error('Exception raised calling connector for POST CAPTURE: ' + err);
    clientUnavailable(err, defer);
  },

  updateComplete = function(chargeId, data, response, defer){
    if (response.statusCode !== 204) {
      logger.error('Failed to update charge status');
      defer.reject(new Error('UPDATE_FAILED'));
      return;
    }

    defer.resolve({success: "OK"});
  },

  clientUnavailable = function(error, defer) {
    defer.reject(new Error('CLIENT_UNAVAILABLE'),error);
  };

  return {
    updateStatus: updateStatus,
    updateToEnterDetails: updateToEnterDetails,
    find: find,
    capture: capture
  };
}();
