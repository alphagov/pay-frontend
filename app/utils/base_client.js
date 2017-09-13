/**
 * @Deprecated
 *
 * Use base_client2.js instead (which is `requestretry` based with retry support and sync with selfservice
 * Leaving for backward compatibility.
 */
const urlParse = require('url')
const https = require('https')
const path = require('path')
const logger = require('winston')

const customCertificate = require(path.join(__dirname, '/custom_certificate'))
const CORRELATION_HEADER_NAME = require(path.join(__dirname, '/correlation_header')).CORRELATION_HEADER

const agentOptions = {
  keepAlive: true,
  maxSockets: process.env.MAX_SOCKETS || 100
}

if (process.env.DISABLE_INTERNAL_HTTPS !== 'true') {
  agentOptions.ca = customCertificate.getCertOptions()
} else {
  logger.warn('DISABLE_INTERNAL_HTTPS is set.')
}

/**
 * @type {https.Agent}
 */
const agent = new https.Agent(agentOptions)

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
const _request = function request (methodName, url, args, callback) {
  const parsedUrl = urlParse.parse(url)
  let headers = {}

  headers['Content-Type'] = 'application/json'
  if (args.correlationId) {
    headers[CORRELATION_HEADER_NAME] = args.correlationId
  }

  const httpsOptions = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port,
    path: parsedUrl.pathname,
    method: methodName,
    agent: agent,
    headers: headers
  }

  const handleResponseCallback = handleResponse(callback, url)

  const req = https.request(httpsOptions, handleResponseCallback)

  if (args.data) {
    req.write(JSON.stringify(args.data))
  }

  req.on('response', readResponse)

  req.end()

  return req
}

function tryParse (data) {
  try {
    return JSON.parse(data)
  } catch (err) {
    return null
  }
}

function handleResponse (callback, url) {
  return function responseProcessor(res){
    let data = ''
    res.on('data', function handleChunk (chunk) {
      data += chunk
    })
    res.on('end', function endResponse () {
      data = tryParse(data)
      if (!data) {
        logger.info('Response from %s in unexpected format: %s', url, data)
      }
      callback(data, {statusCode: res.statusCode})
    })
  }
}

function readResponse (response) {
  response.on('readable', function handleRead() {
    response.read()
  })
}

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
  get: function (url, args, callback) {
    return _request('GET', url, args, callback)
  },

  /**
   *
   * @param {string} url
   * @param {Object} args
   * @param {function} callback
   *
   * @returns {OutgoingMessage}
   */
  post: function (url, args, callback) {
    return _request('POST', url, args, callback)
  },

  /**
   *
   * @param {string} url
   * @param {Object} args
   * @param {function} callback
   *
   * @returns {OutgoingMessage}
   */
  put: function (url, args, callback) {
    return _request('PUT', url, args, callback)
  },

  /**
   *
   * @param {string} url
   * @param {Object} args
   * @param {function} callback
   *
   * @returns {OutgoingMessage}
   */
  patch: function (url, args, callback) {
    return _request('PATCH', url, args, callback)
  },

  /**
   *
   * @param {string} url
   * @param {Object} args
   * @param {function} callback
   *
   * @returns {OutgoingMessage}
   */
  delete: function (url, args, callback) {
    return _request('DELETE', url, args, callback)
  }
}
