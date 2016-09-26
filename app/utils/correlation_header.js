module.exports = function () {
  'use strict';

  var withCorrelationHeader = function (args, correlationId) {
    args = args || {};
    args.headers = args.headers || {};
    args.headers['X-Request-Id'] = correlationId;
    return args;
  };

  return {
    withCorrelationHeader: withCorrelationHeader
  };
}();


