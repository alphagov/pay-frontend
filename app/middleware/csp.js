const helmet = require('helmet')

const sendCspHeader = process.env.CSP_SEND_HEADER === 'true'
const enforceCsp = process.env.CSP_ENFORCE === 'true'
const allowUnsafeEvalScripts = process.env.CSP_ALLOW_UNSAFE_EVAL_SCRIPTS === 'true'
const logger = require('../utils/logger')(__filename)
logger.info(`sendCspHeader: ${sendCspHeader}`)
logger.info(`enforceCsp: ${enforceCsp}`)
logger.info(`allowUnsafeEvalScripts: ${allowUnsafeEvalScripts}`)

// Script responsible for setting 'js-enabled' class, extends GOV.UK frontend `layout` which we have no control over
// and never changes
const govUkFrontendLayoutJsEnabledScriptHash = "'sha256-+6WnXIl4mbFTCARd8N3COQmT3bJJmo32N8q8ZSQAIcU='"

const CSP_SELF = ["'self'"]

const scriptSource = ["'self'", 'https://www.google-analytics.com/',
  (req, res) => `'nonce-${res.locals && res.locals.nonce}'`, govUkFrontendLayoutJsEnabledScriptHash]

// Sript that is being used during zap test: https://github.com/alphagov/pay-endtoend/blob/d685d5bc38d639e8adef629673e5577cb923408e/src/test/resources/uk/gov/pay/pen/tests/frontend.feature#L23
if (allowUnsafeEvalScripts) {
  scriptSource.push("'unsafe-eval'")
}


const csp = helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: CSP_SELF
  },
  reportOnly: !enforceCsp
})

const skipSendingCspHeader = (req, res, next) => { next() }

module.exports = sendCspHeader ? csp : skipSendingCspHeader
