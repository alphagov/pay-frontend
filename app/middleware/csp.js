const helmet = require('helmet')

const sendCspHeader = process.env.CSP_SEND_HEADER === 'true'
const enforceCsp = process.env.CSP_ENFORCE === 'true'
const cspReportUri = process.env.CSP_REPORT_URI
const { environment } = process.env

const sentryCspReportUri = `${cspReportUri}&sentry_environment=${environment}`

const csp = helmet.contentSecurityPolicy({
  directives: {
    reportUri: sentryCspReportUri
  },
  reportOnly: !enforceCsp
})

const skipSendingCspHeader = (req, res, next) => { next() }

module.exports = sendCspHeader ? csp : skipSendingCspHeader
