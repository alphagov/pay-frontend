var Client  = require('node-rest-client').Client;
var client  = new Client();
var _       = require('lodash');
var q       = require('q');


module.exports = function(){
  // TODO PP-545
  statusUrl = function(chargeId){
    return  findUrl(chargeId) + "/status";
  },

  findUrl = function(chargeId){
    var apiUrl = process.env.CONNECTOR_HOST
    return apiUrl + "/v1/frontend/charges/" + chargeId
  }
  // END TODO PP-545

  mergeApiParams = function(params){
    var _default = {
      headers: {"Content-Type": "application/json"},
      data: {}
    }
    _default.data = _.merge(params,_default.data);
    return _default;
  },

  updateStatus = function(chargeId, status){
    var url = statusUrl(chargeId),
    params  = mergeApiParams({new_status: status}),
    defer   = q.defer();
    console.log(url);
    client.put(url, params, function(data, response){
      updateComplete(chargeId, data, response, defer);
    }).on('error',function(err){
      clientUnavailable(err, defer);
    });
    return defer.promise;
  },

  updateComplete = function(chargeId, data, response, defer){
    if (response.statusCode !== 204) {
      defer.reject(new Error('UPDATE_FAILED'));
      return
    }
    // sure there is a better pattern than this
    find(chargeId).then(
      function(data){
        defer.resolve(data);
      },
      function(error) {
        defer.reject(error);
      }
    );
  },

  find = function(chargeId){
    var defer = q.defer();
    client.get(findUrl(chargeId), function(data,response){
      if (response.statusCode !== 200) {
        defer.reject(new Error('GET_FAILED'));
        return
      }
      defer.resolve(data);
    }).on('error',function(err){
      clientUnavailable(err, defer);
    });
    return defer.promise;
  },

  clientUnavailable = function(error, defer) {
    defer.reject(new Error('CLIENT_UNAVAILABLE'),error);
  };

  return {
    updateStatus: updateStatus,
    find: find
  }
}();
