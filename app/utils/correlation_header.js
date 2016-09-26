const CORRELATION_HEADER = 'X-Request-Id';

module.exports = function () {
  'use strict';

  var withCorrelationHeader = function (args, correlationId) {
    args = args || {};
    args.headers = args.headers || {};
    args.headers[CORRELATION_HEADER] = correlationId;
    return args;
  };

  return {
    CORRELATION_HEADER: CORRELATION_HEADER,
    withCorrelationHeader: withCorrelationHeader
  };
}();


