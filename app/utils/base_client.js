/**
 *
 * NOTE : This base client re-work may be more performant than the new base_client. The statement below needs to be checked
 *
 * @Deprecated
 *
 * Use base_client2.js instead (which is `requestretry` based with retry support and sync with selfservice
 * Leaving for backward compatibility.
 */
const urlParse = require('url')
const https = require('https')
const path = require('path')
const logger = require('pino')()

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

  let httpsOptions = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port,
    path: parsedUrl.pathname,
    method: methodName,
    agent: agent,
    headers: headers
  }

  const handleResponseCallback = handleResponse(callback)

  // logger.info('0. Setting up http request')

  const req = https.request(httpsOptions, handleResponseCallback)

  if (args.data) {
    req.write(JSON.stringify(args.data))
  }

  req.end()

  // TODO : Experimental
  httpsOptions = null
  methodName = null
  url = null
  args = null

  return req
}

function tryParse (data) {
  try {
    // logger.info('RESPONSE DATA : ' + data)
    return JSON.parse(data)
  } catch (err) {
    return null
  }
}

function handleResponse (callback) {
  // logger.info('1. Handing response')
  return function readBufferPartial (res) {
    return readBuffer(res, callback)
  }
}

function readBuffer (buffer, callback) {
  // logger.info('2. Reading buffer')
  let data = ''
  buffer.on('readable', function bufferReadable () {
    // logger.info('3. buffer readable')
    const read = buffer.read()
    data += read ? read.toString() : ''
  })
  return buffer.on('end', function bufferEnd () {
    // logger.info('4. buffer end')
    // logger.info('status code : ' + buffer.statusCode)
    let dataRet = tryParse(data)

    // TODO : Experimental
    data = null

    if (!dataRet) {
      logger.error('Response from outbound http request was in unexpected format!')
    }
    // logger.info('5. Calling back')
    callback(dataRet, {statusCode: buffer.statusCode})
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
