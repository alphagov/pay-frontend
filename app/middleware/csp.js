const helmet = require('helmet')

const applyCSPRulesEnabled = process.env.CSP_USE_CARD_PAYMENT_RULES === 'true'
const blockCSPViolations = process.env.CSP_BLOCK_VIOLATIONS === 'true'
const CSPReportURI = process.env.CSP_REPORT_URI
const { environment } = process.env

const sentryCSPReportURI = `${CSPReportURI}&sentry_environment=${environment}`

const csp = helmet.contentSecurityPolicy({
  directives: {
    reportUri: sentryCSPReportURI
  },
  reportOnly: !blockCSPViolations
})

const skipCSPRules = (req, res, next) => { console.log('should be skipping this'); next() }

module.exports = applyCSPRulesEnabled ? csp : skipCSPRules
