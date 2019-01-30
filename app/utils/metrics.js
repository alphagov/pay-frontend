'use strict'

const appmetrics = require('appmetrics')
const metricsHost = process.env.METRICS_HOST || 'localhost'
const metricsPort = process.env.METRICS_PORT || 8125
const metricsPrefix = 'frontend.'

exports.metrics = () => {
  appmetrics.configure({ 'mqtt': 'off' })
  const appmetricsStatsd = require('appmetrics-statsd')

  return appmetricsStatsd.StatsD(metricsHost, metricsPort, metricsPrefix)
}
