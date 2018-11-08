'use strict'

// NPM dependencies
const _ = require('lodash')
const joinURL = require('url-join')
const {getNamespace} = require('continuation-local-storage')
const AWSXRay = require('aws-xray-sdk')
const logger = require('winston')

// Local dependencies
const requestLogger = require('../../../utils/request_logger')
const {CORRELATION_HEADER} = require('../../../utils/correlation_header')

// Constants
const clsXrayConfig = require('../../../../config/xray-cls')

module.exports = (method, verb) => {
  return (uri, opts) => new Promise((resolve, reject) => {
    const namespace = getNamespace(clsXrayConfig.nameSpaceName)
    const clsSegment = namespace ? namespace.get(clsXrayConfig.segmentKeyName) : null

    const args = [uri, opts]
    uri = args.find(arg => typeof arg === 'string')
    opts = args.find(arg => typeof arg === 'object') || {}
    if (verb) opts.method = verb.toUpperCase()
    if (uri && !opts.uri && !opts.url) opts.uri = uri
    const context = {
      correlationId: opts.correlationId,
      startTime: new Date(),
      url: joinURL(_.get(opts, 'baseUrl', ''), opts.url),
      method: opts.method,
      description: opts.description,
      service: opts.service
    }

    // Set headers and optional x-ray trace headers
    _.set(opts, `headers.${CORRELATION_HEADER}`, context.correlationId)
    if (clsSegment) {
      const subSegment = opts.subSegment || new AWSXRay.Segment('_request_nbc', null, clsSegment.trace_id)
      opts.headers['X-Amzn-Trace-Id'] = 'Root=' + clsSegment.trace_id + ';Parent=' + subSegment.id + ';Sampled=1'
    }
    opts.headers['Content-Type'] = opts.headers['Content-Type'] || 'application/json'

    // start request
    requestLogger.logRequestStart(context)
    const startTime = new Date()

    method(opts).then(response => {
      logger.info('[%s] - %s to %s ended - total time %dms', opts.correlationId, opts.method, opts.url, new Date() - startTime)
      resolve(response)
    }).catch(err => {
      logger.info('[%s] - %s to %s ended - total time %dms', opts.correlationId, opts.method, opts.url, new Date() - startTime)
      logger.error(`Calling ${opts.service} threw exception -`, {
        service: opts.service,
        method: opts.method,
        url: opts.url,
        error: err
      })
      reject(err)
    })
  })
}
