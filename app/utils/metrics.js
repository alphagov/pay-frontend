'use strict'

const net = require('net')
const logger = require('winston')
const certinfo = require('cert-info')
const appmetrics = require('appmetrics')
const metricsHost = process.env.METRICS_HOST || 'localhost'
const metricsPort = process.env.METRICS_PORT || 8125
const metricsPrefix = 'frontend.'
const { APPLE_PAY_MERCHANT_ID_CERTIFICATE } = process.env

const sendInitialCertificateMetric = function sendInitialCertificateMetric () {
  if (APPLE_PAY_MERCHANT_ID_CERTIFICATE !== undefined) {
    const merchantIdCert = certinfo.info(APPLE_PAY_MERCHANT_ID_CERTIFICATE)
    const certificateTimeToExpiry = merchantIdCert.expiresAt - Date.now()
    logger.debug(`Merchant identity cert will expire in ${certificateTimeToExpiry} milliseconds`)
    const certificateKey = 'apple-pay.merchant-identity-certificate.time-to-expiry'
    try {
      const socket = net.createConnection(metricsPort, metricsHost, () => {
        logger.debug(`Socket opened with ${metricsHost} ${metricsPort}`)
        socket.write(`${metricsPrefix}.${certificateKey} ${certificateTimeToExpiry}\n`)
        socket.end()
      })

      socket.on('data', (data) => {
        logger.debug('Data event from certificate expiration socket:', data)
      })

      socket.on('end', () => {
        logger.debug('Socket ended')
      })
    } catch (error) {
      logger.error('Unable to send initial certificate metric', error)
    }
  }
}

const configureAppMetrics = function configureAppMetrics () {
  appmetrics.configure({ 'mqtt': 'off' })
  const appmetricsStatsd = require('appmetrics-statsd')

  return appmetricsStatsd.StatsD(metricsHost, metricsPort, metricsPrefix)
}

module.exports = { configureAppMetrics, sendInitialCertificateMetric }
