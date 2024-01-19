const helmet = require('helmet')
const Sentry = require('../utils/sentry').initialiseSentry()
const paths = require('../paths')
const express = require('express')
const { rateLimit } = require('express-rate-limit')
const logger = require('../utils/logger')(__filename)
const hasSubstr = require('../utils/has-substr')

const sendCspHeader = process.env.CSP_SEND_HEADER === 'true'
const enforceCsp = process.env.CSP_ENFORCE === 'true'
const allowUnsafeEvalScripts = process.env.CSP_ALLOW_UNSAFE_EVAL_SCRIPTS === 'true'

// Script responsible for setting 'js-enabled' class, extends GOV.UK frontend `layout` which we have no control over
// and never changes
const govUkFrontendLayoutJsEnabledScriptHash = '\'sha256-+6WnXIl4mbFTCARd8N3COQmT3bJJmo32N8q8ZSQAIcU=\''

const CSP_NONE = ['\'none\'']
const CSP_SELF = ['\'self\'']

// Worldpay 3ds flex iframe - frame and child must be kept in sync
const frameAndChildSourceCardDetails = ['\'self\'', 'https://secure-test.worldpay.com',
  'https://centinelapi.cardinalcommerce.com']

const imgSourceCardDetails = ['\'self\'', 'https://www.google-analytics.com', 'https://www.gstatic.com']

const scriptSourceCardDetails = ['\'self\'', '\'unsafe-inline\'', 'https://www.google-analytics.com',
  (req, res) => `'nonce-${res.locals && res.locals.nonce}'`, govUkFrontendLayoutJsEnabledScriptHash]

const styleSourceCardDetails = ['\'self\'', '\'unsafe-eval\'', '\'unsafe-inline\'']

const formActionWP3DS = ['\'self\'', 'https://centinelapi.cardinalcommerce.com/V1/Cruise/Collect',
  'https://secure-test.worldpay.com/shopper/3ds/ddc.html']

const CSP_REPORTING_ENDPOINT_NAME = 'csp-endpoint'

// Direct redirect use case lets post to any given site
const formActionCardDetails = (req, res) => {
  if (res.locals && res.locals.service &&
    res.locals.service.redirectToServiceImmediatelyOnTerminalState === true) {
    return '*'
  }
  return CSP_SELF[0]
}

// Script that is being used during zap test: https://github.com/alphagov/pay-endtoend/blob/d685d5bc38d639e8adef629673e5577cb923408e/src/test/resources/uk/gov/pay/pen/tests/frontend.feature#L23
if (allowUnsafeEvalScripts) {
  scriptSourceCardDetails.push('\'unsafe-eval\'')
}

// Google Analytics, Google Pay
const connectSourceCardDetails = ['\'self\'', 'https://www.google-analytics.com', 'https://google.com/pay', 'https://www.google.com/pay', 'https://pay.google.com']

const skipSendingCspHeader = (req, res, next) => { next() }

const cspEndpointJson = {
  group: CSP_REPORTING_ENDPOINT_NAME,
  max_age: 100000,
  endpoints: [
    { url: `${paths.csp.path}` }
  ]
}

const setResponseCspReportingEndpoint = (req, res, next) => {
  res.setHeader('Report-To', cspEndpointJson)
  next()
}

const cardDetailsCSP = helmet.contentSecurityPolicy({
  directives: {
    reportTo: CSP_REPORTING_ENDPOINT_NAME,
    frameSrc: frameAndChildSourceCardDetails,
    childSrc: frameAndChildSourceCardDetails,
    imgSrc: imgSourceCardDetails,
    scriptSrc: scriptSourceCardDetails,
    connectSrc: connectSourceCardDetails,
    styleSrc: styleSourceCardDetails,
    formAction: [formActionCardDetails],
    fontSrc: CSP_SELF,
    frameAncestors: CSP_SELF,
    manifestSrc: CSP_NONE,
    mediaSrc: CSP_NONE,
    objectSrc: CSP_NONE,
    baseUri: CSP_NONE,
    blockAllMixedContent: true
  },
  reportOnly: !enforceCsp
})

const worldpayIframeCSP = helmet.contentSecurityPolicy({
  directives: {
    reportTo: CSP_REPORTING_ENDPOINT_NAME,
    defaultSrc: CSP_NONE,
    formAction: formActionWP3DS,
    frameAncestors: CSP_SELF,
    baseUri: CSP_NONE,
    blockAllMixedContent: true
  },
  reportOnly: !enforceCsp
})

const rateLimitMiddleware = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 10, // Limit each IP to 10 requests per window
  standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  legacyHeaders: false // Disable the `X-RateLimit-*` headers.
})

const requestParseMiddleware = (maxPayloadBytes) => {
  return (req, res, next) => {
    if (req.is('application/json') || req.is('application/reports+json') || req.is('application/csp-report')) {
      express.json({
        type: ['application/json', 'application/reports+json', 'application/csp-report'],
        limit: maxPayloadBytes // limit body payload to maxPayloadBytes, validated prior to parsing
      })(req, res, next)
    } else {
      return res.status(400).end()
    }
  }
}

const detectErrorsMiddleware = (err, req, res, next) => {
  if (err) {
    if (err.type === 'entity.too.large') logger.info('CSP violation request payload exceeds maximum size')
    if (err.type === 'entity.parse.failed') logger.info('CSP violation request payload could not be parsed')
    return res.status(400).end()
  }
  next()
}

const captureEventMiddleware = (ignoredStrings) => {
  return (req, res) => {
    const cspReport = req.body['csp-report']
    const userAgent = req.headers['user-agent']
    if (cspReport !== undefined) {
      const blockedUri = cspReport['blocked-uri']
      const violatedDirective = cspReport['violated-directive']
      if (violatedDirective === undefined || blockedUri === undefined) {
        return res.status(400).end()
      } else {
        if (hasSubstr(ignoredStrings, blockedUri)) return res.status(204).end()
        Sentry.captureEvent({
          message: `Blocked ${violatedDirective} from ${blockedUri}`,
          level: 'warning',
          extra: {
            cspReport: cspReport,
            userAgent: userAgent
          }
        })
        return res.status(204).end()
      }
    } else {
      return res.status(400).end()
    }
  }
}

module.exports = {
  cardDetails: sendCspHeader ? cardDetailsCSP : skipSendingCspHeader,
  worldpayIframe: sendCspHeader ? worldpayIframeCSP : skipSendingCspHeader,
  rateLimitMiddleware,
  captureEventMiddleware,
  requestParseMiddleware,
  detectErrorsMiddleware,
  setResponseCspReportingEndpoint
}
