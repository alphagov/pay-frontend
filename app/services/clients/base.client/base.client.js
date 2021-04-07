'use strict'

// NPM dependencies
const http = require('http')
const urlParse = require('url').parse // eslint-disable-line
const _ = require('lodash')
const request = require('requestretry')

// Local dependencies
const CORRELATION_HEADER_NAME = require('../../../../config/correlation_header').CORRELATION_HEADER
const { addProxy } = require('../../../utils/add_proxy')

const agentOptions = {
  keepAlive: true,
  maxSockets: process.env.MAX_SOCKETS || 100
}

// Constants
const RETRIABLE_ERRORS = ['ECONNRESET']

function retryOnEconnreset (err) {
  return err && _.includes(RETRIABLE_ERRORS, err.code)
}

const httpAgent = new http.Agent(agentOptions)

const client = request
  .defaults({
    json: true,
    // Adding retry on ECONNRESET as a temporary fix for PP-1727
    maxAttempts: 3,
    retryDelay: 5000,
    retryStrategy: retryOnEconnreset
  })

const getHeaders = function getHeaders (args, url) {
  let headers = {}
  headers['Content-Type'] = 'application/json'
  headers[CORRELATION_HEADER_NAME] = args.correlationId || ''
  if (url) {
    const port = (urlParse(url).port) ? ':' + urlParse(url).port : ''
    headers['host'] = urlParse(url).hostname + port
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
const _request = function request (methodName, url, args, callback) {
  const proxiedUrl = addProxy(url)
  const optionalPort = proxiedUrl.port ? ':' + proxiedUrl.port : ''
  const requestOptions = {
    uri: proxiedUrl.protocol + '//' + proxiedUrl.hostname + optionalPort + proxiedUrl.pathname,
    method: methodName,
    agent: httpAgent,
    headers: getHeaders(args, url)
  }

  if (args.payload) {
    requestOptions.body = args.payload
  }

  if (args.qs) {
    requestOptions.qs = args.qs
  }

  // Return a client using a callback, or one using a promise depending on what was passed
  return callback ? client(requestOptions, callback) : client(requestOptions)
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
