'use strict'

const metrics = require('metrics')

const registry = new metrics.Report
const graphiteReporter = new metrics.GraphiteReporter(registry, "frontend", process.env.METRICS_HOST, process.env.METRICS_PORT || 8094)
graphiteReporter.start(1000)

module.exports.getCounter = function getCounter(metricsPrefix) {
  if (!registry.getMetric(metricsPrefix)) {
    const counter = new metrics.Counter
    registry.addMetric(metricsPrefix, counter)
  }
  return registry.getMetric(metricsPrefix)
}