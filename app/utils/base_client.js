'use strict'

/**
 * @Deprecated
 *
 * Use base_client2.js instead (which is `requestretry` based with retry support and sync with selfservice
 * Leaving for backward compatibility.
 */
const urlParse = require('url')
const https = require('https')
const http = require('http')
const logger = require('winston')

const customCertificate = require('./custom_certificate')
const CORRELATION_HEADER_NAME = require('./correlation_header').CORRELATION_HEADER

let agentOptions = {
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
const _http = process.env.DISABLE_INTERNAL_HTTPS ? http : https
const agent = new _http.Agent(agentOptions)
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

  let req = _http.request(httpsOptions, (res) => {
    let data = ''
    res.on('data', (chunk) => {
      data += chunk
    })

    res.on('end', () => {
      try {
        data = JSON.parse(data)
      } catch (e) {
        // if response exists but is not parsable, log it and carry on
        if (data) {
          logger.info('Response from %s in unexpected format: %s', url, data)
        }
        data = null
      }
      callback(data, {statusCode: res.statusCode})
    })
  })

  if (args.data) {
    req.write(JSON.stringify(args.data))
  }

  req.on('response', (response) => {
    response.on('readable', () => {
      response.read()
    })
  })

  req.end()

  return req
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
