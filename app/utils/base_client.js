const urlParse = require('url');
const https = require('https');

const agentOptions = {
  keepAlive: true,
  maxSockets: process.env.MAX_SOCKETS || 100
};

/**
 * @type {https.Agent}
 */
var agent = new https.Agent(agentOptions);

/**
 *
 * @param {string} methodName
 * @param {string} url
 * @param {Object} args
 * @param {Function} callback
 *
 * @returns {OutgoingMessage}
 *
 * @private
 */
var _request = function request(methodName, url, args, callback) {
  const parsedUrl = urlParse.parse(url);

  const postHeaders =  {
    "Content-Type": "application/json",
    "x-request-id": args.correlationId
  };

  const httpsOptions = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port,
    path: parsedUrl.pathname,
    method: methodName,
    agent: agent,
    headers: postHeaders
  };

  let req = https.request(httpsOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      data = data ? JSON.parse(data) : null;
      callback(data, res);
    });
  });

  if (args.data) {
    req.write(JSON.stringify(args.data));
  }

  req.on('response', function(response) {
    response.on('readable', function() {
      response.read();
    });
  });

  req.end();
  return req;
};


/*
 * @module baseClient
 */
module.exports = {
  /**
   *
   * @param {string} url
   * @param {Object} args
   * @param {function} callback
   *
   * @returns {OutgoingMessage}
   */
  post : function (url, args, callback) {
    return _request('POST', url, args, callback);
  },

  /**
   *
   * @param {string} url
   * @param {Object} args
   * @param {function} callback
   *
   * @returns {OutgoingMessage}
   */
  get: function(url, args, callback) {
    return _request('GET', url, args, callback);
  },

  /**
   *
   * @param {string} url
   * @param {Object} args
   * @param {function} callback
   *
   * @returns {OutgoingMessage}
   */
  put: function(url, args, callback) {
    return _request('PUT', url, args, callback);
  },

  /**
   *
   * @param {string} url
   * @param {Object} args
   * @param {function} callback
   *
   * @returns {OutgoingMessage}
   */
  patch: function(url, args, callback) {
    return _request('PATCH', url, args, callback);
  },

  /**
   *
   * @param {string} url
   * @param {Object} args
   * @param {function} callback
   *
   * @returns {OutgoingMessage}
   */
  delete: function(url, args, callback) {
    return _request('DELETE', url, args, callback);
  }
};