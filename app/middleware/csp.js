const helmet = require('helmet')

const sendCspHeader = process.env.CSP_SEND_HEADER === 'true'
const enforceCsp = process.env.CSP_ENFORCE === 'true'
const cspReportUri = process.env.CSP_REPORT_URI
const environment = process.env.ENVIRONMENT
const allowUnsafeEvalScripts = process.env.CSP_ALLOW_UNSAFE_EVAL_SCRIPTS === 'true'

const sentryCspReportUri = `${cspReportUri}&sentry_environment=${environment}`

// Script responsible for setting 'js-enabled' class, extends GOV.UK frontend `layout` which we have no control over
// and never changes
const govUkFrontendLayoutJsEnabledScriptHash = "'sha256-+6WnXIl4mbFTCARd8N3COQmT3bJJmo32N8q8ZSQAIcU='"

const CSP_NONE = ["'none'"]
const CSP_SELF = ["'self'"]

// Worldpay 3ds flex iframe - frame and child must be kept in sync
const frameAndChildSourceCardDetails = ["'self'", 'https://secure-test.worldpay.com',
  'https://centinelapi.cardinalcommerce.com']

const imgSourceCardDetails = ["'self'", 'https://www.google-analytics.com', 'https://www.gstatic.com']

const scriptSourceCardDetails = ["'self'", "'unsafe-inline'", 'https://www.google-analytics.com',
  (req, res) => `'nonce-${res.locals && res.locals.nonce}'`, govUkFrontendLayoutJsEnabledScriptHash]

const styleSourceCardDetails = ["'self'", "'unsafe-eval'", "'unsafe-inline'"]

const formActionWP3DS = ["'self'", 'https://centinelapi.cardinalcommerce.com/V1/Cruise/Collect',
  'https://secure-test.worldpay.com/shopper/3ds/ddc.html']

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
  scriptSourceCardDetails.push("'unsafe-eval'")
}

// Google Analytics, Google Pay
const connectSourceCardDetails = ["'self'", 'https://www.google-analytics.com', 'https://google.com/pay', 'https://pay.google.com']

const skipSendingCspHeader = (req, res, next) => { next() }

const cardDetailsCSP = helmet.contentSecurityPolicy({
  directives: {
    reportUri: sentryCspReportUri,
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
    reportUri: sentryCspReportUri,
    defaultSrc: CSP_NONE,
    formAction: formActionWP3DS,
    frameAncestors: CSP_SELF,
    baseUri: CSP_NONE,
    blockAllMixedContent: true
  },
  reportOnly: !enforceCsp
})

module.exports = {
  cardDetails: sendCspHeader ? cardDetailsCSP : skipSendingCspHeader,
  worldpayIframe: sendCspHeader ? worldpayIframeCSP : skipSendingCspHeader
}
