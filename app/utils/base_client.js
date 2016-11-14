var Client      = require('node-rest-client').Client;
var client      = new Client();
var withCorrelationHeader = require('../utils/correlation_header.js').withCorrelationHeader;

var headers = { "Content-Type": "application/json" };
var config  = {"keepAlive": true};

module.exports = {
  post : function (url, args, callBack) {
    return client.post(
      url,
      withCorrelationHeader({data: args.data, headers: headers, requestConfig: config},
      args.correlationId),
      callBack);
  }
};