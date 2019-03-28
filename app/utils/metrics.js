'use strict'

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
    const certificateTimeToExpiry = Math.floor((merchantIdCert.expiresAt - Date.now()) / 1000 / 60 / 60 / 24)
    logger.info(`The Apple Pay Merchant identity cert will expire in ${certificateTimeToExpiry} days`)
  }
}

const configureAppMetrics = function configureAppMetrics () {
  appmetrics.configure({ 'mqtt': 'off' })
  const appmetricsStatsd = require('appmetrics-statsd')

  return appmetricsStatsd.StatsD(metricsHost, metricsPort, metricsPrefix)
}

module.exports = { configureAppMetrics, sendInitialCertificateMetric }
