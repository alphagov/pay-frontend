var Client  = require('node-rest-client').Client;
var client  = new Client();
var _       = require('lodash');
var q       = require('q');
var logger  = require('winston');
var paths   = require('../paths.js');
var State   = require('./state.js');
var withCorrelationHeader = require(__dirname + '/../utils/correlation_header.js').withCorrelationHeader;

module.exports = function(correlationId) {
  'use strict';

  correlationId = correlationId || '';

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

    logger.debug('[%s] Calling connector to update charge status -', correlationId, {
      service: 'connector',
      method: 'PUT',
      chargeId: chargeId,
      newStatus: status,
      url: url
    });

    var startTime = new Date();
    client.put(url, withCorrelationHeader(params, correlationId), function (data, response) {
      logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'PUT', url, new Date() - startTime);
      updateComplete(chargeId, data, response, defer);

    }).on('error',function(err){
      logger.info('[] - %s to %s ended - total time %dms', 'PUT', url, new Date() - startTime);
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
    logger.debug('[%s] Calling connector to get charge -', correlationId, {
      service: 'connector',
      method: 'GET',
      chargeId: chargeId,
      url: url
    });

    var startTime = new Date();
    var params = {};
    client.get(url, withCorrelationHeader(params, correlationId), function(data, response){
      if (response.statusCode !== 200) {
        logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'GET', url, new Date() - startTime);
        logger.warn('[%s] Calling connector to get charge failed -', correlationId, {
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
      logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'GET', url, new Date() - startTime);
      logger.error('[%s] Calling connector to get charge threw exception -', correlationId, {
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

    logger.debug('[%s] Calling connector to do capture -', correlationId, {
      service: 'connector',
      method: 'POST',
      chargeId: chargeId,
      url: url
    });
    var startTime = new Date();
    client.post(url, withCorrelationHeader(params, correlationId), function(data, response){
      logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'POST', url, new Date() - startTime);
      captureComplete(data, response, defer);
    })
    .on('error',function(err) {
      logger.info('[%s] - %s to %s ended - total time %dms', 'POST', correlationId, url, new Date() - startTime);
      logger.error('[%s] Calling connector to do capture failed -', correlationId, {
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

    logger.debug('[%s] Calling connector to cancel a charge -', correlationId, {
      service: 'connector',
      method: 'POST',
      chargeId: chargeId,
      url: url
    });

    var startTime = new Date();
    client.post(url, withCorrelationHeader(params, correlationId), function(data, response){
        logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'POST', url, new Date() - startTime);
        cancelComplete(data, response, defer);
      })
      .on('error',function(err){
        logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'POST', url, new Date() - startTime);
        logger.error('[%s] Calling connector cancel a charge threw exception -', correlationId, {
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
    logger.error('[%s] Calling connector cancel a charge failed -', correlationId, {
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
    logger.debug('[%s] Calling connector to find a charge by token -', correlationId, {
      service: 'connector',
      method: 'GET'
    });

    var startTime = new Date();
    var findByUrl = connectorurl('findByToken',{chargeTokenId: tokenId});
    var params = {};
    client.get(findByUrl, withCorrelationHeader(params, correlationId),function(data, response){
      logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'GET', findByUrl, new Date() - startTime);
      if (response.statusCode !== 200) {
        logger.warn('[%s] Calling connector to find a charge by token failed -', correlationId, {
          service: 'connector',
          method: 'GET',
          status: response.statusCode
        });
        defer.reject(new Error('GET_FAILED'));
        return;
      }

      defer.resolve(data);
    }).on('error', function(err){
      logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'GET', findByUrl, new Date() - startTime);
      logger.error('[%s] Calling connector to find a charge by token threw exception -', correlationId, {
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
      logger.error('[%s] Calling connector to update charge status failed -', correlationId, {
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

    var startTime = new Date();
    var chargesUrl = process.env.CONNECTOR_HOST + "/v1/frontend/charges/";

    logger.debug('[%s] Calling connector to patch charge -', correlationId, {
      service: 'connector',
      method: 'PATCH'
    });

    var params = {
      headers: {"Content-Type": "application/json"},
      data: {
        op: op,
        path: path,
        value: value
      }
    };

    client.patch(chargesUrl + chargeId, withCorrelationHeader(params, correlationId), function (data, response) {
         logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'PATCH', chargesUrl, new Date() - startTime);
        var code = response.statusCode;
        if (code === 200) {
          defer.resolve();
        } else {
          defer.reject();
        }
      }).on('error', function(err){
        logger.info('[%s] - %s to %s ended - total time %dms', correlationId, 'PATCH', chargesUrl, new Date() - startTime);
        logger.error('[%s] Calling connector to patch a charge threw exception -', correlationId, {
          service:'connector',
          method:'PATCH',
          error:err
        });
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
};
