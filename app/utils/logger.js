const { createLogger, format, transports } = require('winston')
const { json, splat, prettyPrint } = format
const { govUkPayLoggingFormat } = require('@govuk-pay/pay-js-commons').logging
const { addSentryToErrorLevel } = require('./sentry.js')
const { getNamespace } = require('continuation-local-storage')
const {
  CORRELATION_ID,
  PAYMENT_EXTERNAL_ID
} = require('@govuk-pay/pay-js-commons').logging.keys
const { NAMESPACE_NAME } = require('../../config/cls')

const addSessionData = format((info) => {
  const session = getNamespace(NAMESPACE_NAME)
  if (session) {
    info[CORRELATION_ID] = session.get(CORRELATION_ID)
    info[PAYMENT_EXTERNAL_ID] = session.get(PAYMENT_EXTERNAL_ID)
  }
  return info
})

const logger = createLogger({
  format: format.combine(
    splat(),
    prettyPrint(),
    govUkPayLoggingFormat({ container: 'frontend', environment: process.env.ENVIRONMENT }),
    addSessionData(),
    json()
  ),
  transports: [
    new transports.Console()
  ]
})

module.exports = (loggerName) => {
  const childLogger = logger.child({ logger_name: loggerName })
  return addSentryToErrorLevel(childLogger)
}
