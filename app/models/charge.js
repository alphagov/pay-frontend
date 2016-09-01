var Client  = require('node-rest-client').Client;
var client  = new Client();
var _       = require('lodash');
var q       = require('q');
var logger  = require('winston');
var paths   = require('../paths.js');
var State   = require('./state.js');
var humps   = require("humps");

module.exports = function() {
  'use strict';

  var connectorurl = function(resource,params){
    return paths.generateRoute(`connectorCharge.${resource}`,params);
  },

  urlFor =  function(resource, chargeId){
    return paths.generateRoute(`card.${resource}`,{chargeId: chargeId });
  },

  mergeApiParams = function(params) {
    params = (params) ? params: {};
    var _default = {
      headers: {"Content-Type": "application/json"},
      data: {}
    };
    _default.data = _.merge(params,_default.data);
    return _default;
  },

  updateToEnterDetails = function(chargeId) {
    return updateStatus(chargeId, State.ENTERING_CARD_DETAILS);
  },

  updateStatus = function(chargeId, status){
    var url = connectorurl('updateStatus',{chargeId: chargeId}),
    params  = mergeApiParams({new_status: status}),
    defer   = q.defer();

    logger.debug('Calling connector to update charge status -', {
      service: 'connector',
      method: 'PUT',
      chargeId: chargeId,
      newStatus: status,
      url: url
    });

    client.put(url, params, function(data, response){
      updateComplete(chargeId, data, response, defer);
    }).on('error',function(err){
      logger.error('Calling connector to update charge status threw exception -', {
        service: 'connector',
        method: 'PUT',
        chargeId: chargeId,
        url: url,
        error: err
      });
      clientUnavailable(err, defer);
    });

    return defer.promise;
  },

  find = function(chargeId){
    var defer = q.defer();
    var url = connectorurl('show',{chargeId: chargeId});

    //todo here we call connector to get the charge
    logger.debug('Calling connector to get charge -', {
      service: 'connector',
      method: 'GET',
      chargeId: chargeId,
      url: url
    });

    client.get(url, function(data, response){
      if (response.statusCode !== 200) {
        logger.warn('Calling connector to get charge failed -', {
          service: 'connector',
          method: 'GET',
          chargeId: chargeId,
          url: url,
          status: response.statusCode
        });
        return defer.reject(new Error('GET_FAILED'));
      }
      defer.resolve(data);
    }).on('error',function(err){
      logger.error('Calling connector to get charge threw exception -', {
        service: 'connector',
        method: 'GET',
        chargeId: chargeId,
        url: url,
        error: err
      });
      clientUnavailable(err, defer);
    });
    return defer.promise;
  },

  capture = function(chargeId){
    var url = connectorurl('capture',{chargeId: chargeId}),
    params  = mergeApiParams(),
    defer   = q.defer();

    logger.debug('Calling connector to do capture -', {
      service: 'connector',
      method: 'POST',
      chargeId: chargeId,
      url: url
    });
    client.post(url, params, function(data, response){
      captureComplete(data, response, defer);
    })
    .on('error',function(err) {
      logger.error('Calling connector to do capture failed -', {
        service:'connector',
        method:'POST',
        chargeId: chargeId,
        url: url,
        error:err
      });
      captureFail(err, defer);
    });

    return defer.promise;
  },

  cancel = function(chargeId){
    var url = connectorurl('cancel',{chargeId: chargeId}),
      params  = mergeApiParams(),
      defer   = q.defer();

    logger.debug('Calling connector to cancel a charge -', {
      service: 'connector',
      method: 'POST',
      chargeId: chargeId,
      url: url
    });
    client.post(url, params, function(data, response){
        cancelComplete(data, response, defer);
      })
      .on('error',function(err){
        logger.error('Calling connector cancel a charge threw exception -', {
          service:'connector',
          method:'POST',
          url: url,
          error: err
        });
        cancelFail(err, defer);
      });

    return defer.promise;
  },

  cancelComplete = function(data, response, defer) {
    var code = response.statusCode;
    if (code === 204) return defer.resolve();
    logger.error('Calling connector cancel a charge failed -', {
      service:'connector',
      method:'POST',
      status: code
    });
    if (code === 400) return defer.reject(new Error('CANCEL_FAILED'));
    return defer.reject(new Error('POST_FAILED'));
  },

  cancelFail = function(err, defer){
    clientUnavailable(err, defer);
  },

  findByToken = function(tokenId){
    var defer = q.defer();
    logger.debug('Calling connector to find a charge by token -', {
      service: 'connector',
      method: 'GET'
    });
    client.get(connectorurl('findByToken',{chargeTokenId: tokenId}), function(data, response){
      if (response.statusCode !== 200) {
        logger.warn('Calling connector to find a charge by token failed -', {
          service: 'connector',
          method: 'GET',
          status: response.statusCode
        });
        defer.reject(new Error('GET_FAILED'));
        return;
      }

      // TODO: the conditional statement will need to be removed once PP-839 pay-connector is merged to master
      if (data.gatewayAccount && data.gatewayAccount.card_types) {
        data.gatewayAccount.cardTypes = humps.camelizeKeys(data.gatewayAccount.card_types);
        delete data.gatewayAccount.card_types;
      }
      defer.resolve(data);
    }).on('error', function(err){
      logger.error('Calling connector to find a charge by token threw exception -', {
        service:'connector',
        method:'GET',
        error:err
      });
      clientUnavailable(err, defer);
    });
    return defer.promise;
  },

  captureComplete = function(data, response, defer) {
    var code = response.statusCode;
    if (code === 204) return defer.resolve();
    if (code === 400) return defer.reject(new Error('CAPTURE_FAILED'));
    return defer.reject(new Error('POST_FAILED'));
  },

  captureFail = function(err, defer){
    clientUnavailable(err, defer);
  },

  updateComplete = function(chargeId, data, response, defer){
    if (response.statusCode !== 204) {
      logger.error('Calling connector to update charge status failed -', {
        chargeId: chargeId,
        status: response.statusCode
      });
      defer.reject(new Error('UPDATE_FAILED'));
      return;
    }

    defer.resolve({success: "OK"});
  },

  patch = function(chargeId, op, path, value) {
    var defer   = q.defer();
    client.patch(process.env.CONNECTOR_HOST + "/v1/frontend/charges/" + chargeId, {
        headers: {"Content-Type": "application/json"},
        data: {
          op: op,
          path: path,
          value: value
        }
      }, function(data, response) {
        var code = response.statusCode;
        if (code === 200) {
          defer.resolve();
        } else {
          defer.reject();
        }
      }).on('error', function(){
          defer.reject();
      });

      return defer.promise;
  },

  clientUnavailable = function(error, defer) {
    defer.reject(new Error('CLIENT_UNAVAILABLE'),error);
  };

  return {
    updateStatus: updateStatus,
    updateToEnterDetails: updateToEnterDetails,
    find: find,
    capture: capture,
    findByToken: findByToken,
    cancel: cancel,
    patch: patch,
    urlFor: urlFor
  };
}();
