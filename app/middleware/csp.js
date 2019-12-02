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

// Worldpay 3ds flex iframe
const CSP_NONE = ["'none'"]
const CSP_SELF = ["'self'"]

// Worldpay 3ds flex iframe - frame and child must be kept in sync
const frameAndChildSource = ["'self'", 'https://secure-test.worldpay.com/', 'https://centinelapi.cardinalcommerce.com/']

const imgSource = ["'self'", 'https://www.google-analytics.com/']

const scriptSource = ["'self'", 'https://www.google-analytics.com/',
  (req, res) => `'nonce-${res.locals && res.locals.nonce}'`, govUkFrontendLayoutJsEnabledScriptHash]

// Sript that is being used during zap test: https://github.com/alphagov/pay-endtoend/blob/d685d5bc38d639e8adef629673e5577cb923408e/src/test/resources/uk/gov/pay/pen/tests/frontend.feature#L23
if (allowUnsafeEvalScripts) {
  scriptSource.push("'unsafe-eval'")
}

// Google analytics, Apple pay, Google pay uses standard Payment Request API so requires no exceptions
const connectSource = ["'self'", 'https://www.google-analytics.com/',
  'https://apple-pay-gateway.apple.com/', 'https://apple-pay-gateway-nc-pod1.apple.com/',
  'https://apple-pay-gateway-nc-pod2.apple.com/', 'https://apple-pay-gateway-nc-pod3.apple.com/',
  'https://apple-pay-gateway-nc-pod4.apple.com/', 'https://apple-pay-gateway-nc-pod5.apple.com/',
  'https://apple-pay-gateway-pr-pod1.apple.com/', 'https://apple-pay-gateway-pr-pod2.apple.com/',
  'https://apple-pay-gateway-pr-pod3.apple.com/', 'https://apple-pay-gateway-pr-pod4.apple.com/',
  'https://apple-pay-gateway-pr-pod5.apple.com/', 'https://apple-pay-gateway-nc-pod1-dr.apple.com/',
  'https://apple-pay-gateway-nc-pod2-dr.apple.com/', 'https://apple-pay-gateway-nc-pod3-dr.apple.com/',
  'https://apple-pay-gateway-nc-pod4-dr.apple.com/', 'https://apple-pay-gateway-nc-pod5-dr.apple.com/',
  'https://apple-pay-gateway-pr-pod1-dr.apple.com/', 'https://apple-pay-gateway-pr-pod2-dr.apple.com/',
  'https://apple-pay-gateway-pr-pod3-dr.apple.com/', 'https://apple-pay-gateway-pr-pod4-dr.apple.com/',
  'https://apple-pay-gateway-pr-pod5-dr.apple.com/',
  'https://cn-applepay-gateway-sh-pod1.apple.com/', 'https://cn-applepay-gateway-sh-pod1-dr.apple.com/',
  'https://cn-applepay-gateway-sh-pod2.apple.com/', 'https://cn-applepay-gateway-sh-pod2-dr.apple.com/',
  'https://cn-applepay-gateway-sh-pod3.apple.com/', 'https://cn-applepay-gateway-sh-pod3-dr.apple.com/',
  'https://cn-applepay-gateway-tj-pod1.apple.com/', 'https://cn-applepay-gateway-tj-pod1-dr.apple.com/',
  'https://cn-applepay-gateway-tj-pod2.apple.com/', 'https://cn-applepay-gateway-tj-pod2-dr.apple.com/',
  'https://cn-applepay-gateway-tj-pod3.apple.com/', 'https://cn-applepay-gateway-tj-pod3-dr.apple.com/']

const csp = helmet.contentSecurityPolicy({
  directives: {
    reportUri: sentryCspReportUri,
    frameSrc: frameAndChildSource,
    childSrc: frameAndChildSource,
    imgSrc: imgSource,
    scriptSrc: scriptSource,
    connectSrc: connectSource,
    styleSrc: CSP_SELF,
    formAction: CSP_SELF,
    fontSrc: CSP_SELF,
    frameAncestors: CSP_SELF,
    manifestSrc: CSP_NONE,
    mediaSrc: CSP_NONE,
    objectSrc: CSP_NONE,
    prefetchSrc: CSP_SELF,
    baseUri: CSP_NONE,
    blockAllMixedContent: true
  },
  reportOnly: !enforceCsp
})

const skipSendingCspHeader = (req, res, next) => { next() }

module.exports = sendCspHeader ? csp : skipSendingCspHeader
