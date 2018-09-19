'use strict'

// NPM dependencies
const https = require('https')
const httpAgent = require('http').globalAgent
const urlParse = require('url').parse
const _ = require('lodash')
const logger = require('winston')
const request = require('requestretry')
const {getNamespace} = require('continuation-local-storage')
const AWSXRay = require('aws-xray-sdk')

// Local dependencies
const customCertificate = require('./custom_certificate')
const CORRELATION_HEADER_NAME = require('./correlation_header').CORRELATION_HEADER

const agentOptions = {
  keepAlive: true,
  maxSockets: process.env.MAX_SOCKETS || 100
}

// Constants
const clsXrayConfig = require('../../config/xray-cls')
const RETRIABLE_ERRORS = ['ECONNRESET']

function retryOnEconnreset (err) {
  return err && _.includes(RETRIABLE_ERRORS, err.code)
}

if (process.env.DISABLE_INTERNAL_HTTPS !== 'true') {
  agentOptions.ca = customCertificate.getCertOptions()
} else {
  logger.warn('DISABLE_INTERNAL_HTTPS is set.')
}

const httpsAgent = new https.Agent(agentOptions)

const client = request
  .defaults({
    json: true,
    // Adding retry on ECONNRESET as a temporary fix for PP-1727
    maxAttempts: 3,
    retryDelay: 5000,
    retryStrategy: retryOnEconnreset
  })

const getHeaders = function getHeaders (args, segmentData) {
  let headers = {}
  headers['Content-Type'] = 'application/json'
  headers[CORRELATION_HEADER_NAME] = args.correlationId || ''

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
  headers['xhost'] = 'connector:9300'
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
  let agent = urlParse(url).protocol === 'http:' ? httpAgent : httpsAgent
  const namespace = getNamespace(clsXrayConfig.nameSpaceName)
  const clsSegment = namespace ? namespace.get(clsXrayConfig.segmentKeyName) : null

  const requestOptions = {
    uri: url,
    method: methodName,
    agent: agent,
    headers: getHeaders(args, {clsSegment: clsSegment, subSegment: subSegment})
  }

  if (args.payload) {
    requestOptions.body = args.payload
  }

  if (args.qs) {
    requestOptions.qs = args.qs
  }

  return client(requestOptions, callback)
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
