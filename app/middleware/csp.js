const helmet = require('helmet')

const sendCspHeader = process.env.CSP_SEND_HEADER === 'true'
const enforceCsp = process.env.CSP_ENFORCE === 'true'
const cspReportUri = process.env.CSP_REPORT_URI
const environment = process.env.ENVIRONMENT

const sentryCspReportUri = `${cspReportUri}&sentry_environment=${environment}`

// Worldpay 3ds flex iframe
const frameSource = ["'self'", 'https://secure-test.worldpay.com/']

// Google analytics
const imgSource = ["'self'", 'https://www.google-analytics.com/', 'http://www.google-analytics.com/']

// Google analytics
const scriptSource = ["'self'", 'https://www.google-analytics.com/', 'http://www.google-analytics.com/',
  (req, res) => `'nonce-${res.locals && res.locals.nonce}'`, "'unsafe-inline'"]
const styleSource = ["'self'"]

// Google analytics, Apple pay, Google pay uses standard Payment Request API so requires no exceptions
const connectSource = ["'self'", 'https://www.google-analytics.com/', 'http://www.google-analytics.com/',
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
    frameSrc: frameSource,
    imgSrc: imgSource,
    styleSrc: styleSource,
    scriptSrc: scriptSource,
    connectSrc: connectSource
  },
  reportOnly: !enforceCsp
})

const skipSendingCspHeader = (req, res, next) => { next() }

module.exports = sendCspHeader ? csp : skipSendingCspHeader
