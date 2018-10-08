'use strict'

/**
 * @Deprecated
 *
 * Use base_client2.js instead (which is `requestretry` based with retry support and sync with selfservice
 * Leaving for backward compatibility.
 */
// NPM dependencies
const urlParse = require('url').parse
const logger = require('winston')
const http = require('http')
const _ = require('lodash')
const {getNamespace} = require('continuation-local-storage')
const AWSXRay = require('aws-xray-sdk')

// Local dependencies
const CORRELATION_HEADER_NAME = require('./correlation_header').CORRELATION_HEADER
const {addProxy} = require('./add_proxy')

const agentOptions = {
  keepAlive: true,
  maxSockets: process.env.MAX_SOCKETS || 100,
  ciphers: 'AES256-GCM-SHA384'
}

const clsXrayConfig = require('../../config/xray-cls')

/**
 * @type {http.Agent}
 */
const agent = new http.Agent(agentOptions)

const getHeaders = function getHeaders (args, segmentData, url) {
  let headers = {}
  headers['Content-Type'] = 'application/json'
  headers[CORRELATION_HEADER_NAME] = args.correlationId || ''
  if (url) {
    var port = (urlParse(url).port) ? ':' + urlParse(url).port : ''
    headers['host'] = urlParse(url).hostname + port
  }

  if (segmentData.clsSegment) {
    const subSegment = segmentData.subSegment || new AWSXRay.Segment('_request', null, segmentData.clsSegment.trace_id)
    headers['X-Amzn-Trace-Id'] = [
      'Root=',
      segmentData.clsSegment.trace_id,
      ';Parent=',
      subSegment.id,
      ';Sampled=1'
    ].join('')
  }
  _.merge(headers, args.headers)

  return headers
}

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
const _request = function request (methodName, url, args, callback, subSegment) {
  const namespace = getNamespace(clsXrayConfig.nameSpaceName)
  const clsSegment = namespace ? namespace.get(clsXrayConfig.segmentKeyName) : null
  const proxiedUrl = addProxy(url)

  const httpOptions = {
    hostname: proxiedUrl.hostname,
    port: proxiedUrl.port,
    path: proxiedUrl.pathname,
    method: methodName,
    agent: agent,
    headers: getHeaders(args, {clsSegment: clsSegment, subSegment: subSegment}, url)
  }

  let req = http.request(httpOptions, (res) => {
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
  get: function (url, args, callback, subSegment) {
    return _request('GET', url, args, callback, subSegment)
  },

  /**
     *
     * @param {string} url
     * @param {Object} args
     * @param {function} callback
     *
     * @returns {OutgoingMessage}
     */
  post: function (url, args, callback, subSegment) {
    return _request('POST', url, args, callback, subSegment)
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
  patch: function (url, args, callback, subSegment) {
    return _request('PATCH', url, args, callback, subSegment)
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
