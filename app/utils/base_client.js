'use strict'

/**
 * @Deprecated
 *
 * Use base_client2.js instead (which is `requestretry` based with retry support and sync with selfservice
 * Leaving for backward compatibility.
 */
// NPM dependencies
const urlParse = require('url')
const logger = require('winston')
const https = setHttpClient()
const _ = require('lodash')
const {getNamespace} = require('continuation-local-storage')
const AWSXRay = require('aws-xray-sdk')
const url = require('url')

// Local dependencies
const customCertificate = require('./custom_certificate')
const CORRELATION_HEADER_NAME = require('./correlation_header').CORRELATION_HEADER

function setHttpClient () {
  if (process.env.DISABLE_INTERNAL_HTTPS === 'true') {
    logger.warn('DISABLE_INTERNAL_HTTPS is enabled, base_client will use http.')
    return require('http')
  } else {
    return require('https')
  }
}

const agentOptions = {
  keepAlive: true,
  maxSockets: process.env.MAX_SOCKETS || 100
}

const clsXrayConfig = require('../../config/xray-cls')

if (process.env.DISABLE_INTERNAL_HTTPS !== 'true') {
  agentOptions.ca = customCertificate.getCertOptions()
} else {
  logger.warn('DISABLE_INTERNAL_HTTPS is set.')
}

/**
 * @type {https.Agent}
 */
const agent = new https.Agent(agentOptions)

const getHeaders = function getHeaders (targetUrl, args, segmentData) {
  let headers = {}
  headers['Content-Type'] = 'application/json'
  headers[CORRELATION_HEADER_NAME] = args.correlationId || ''
  headers['host'] = url.parse(targetUrl).hostname + ':' + url.parse(targetUrl).port

  console.debug('with headers:' + headers)

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
  const parsedUrl = urlParse.parse(url)

  const httpsOptions = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port,
    path: parsedUrl.pathname,
    method: methodName,
    agent: agent,
    headers: getHeaders(url, args, {clsSegment: clsSegment, subSegment: subSegment})
  }

  let req = https.request(httpsOptions, (res) => {
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
