const helmet = require('helmet')

const applyCspRulesEnabled = process.env.CSP_SEND_HEADER === 'true'
const blockCspViolations = process.env.CSP_ENFORCE_VIOLATIONS === 'true'
const cspReportUri = process.env.CSP_REPORT_URI
const { environment } = process.env

const sentryCspReportUri = `${cspReportUri}&sentry_environment=${environment}`

const csp = helmet.contentSecurityPolicy({
  directives: {
    reportUri: sentryCspReportUri
  },
  reportOnly: !blockCspViolations
})

const skipCSPRules = (req, res, next) => { next() }

module.exports = applyCspRulesEnabled ? csp : skipCSPRules
