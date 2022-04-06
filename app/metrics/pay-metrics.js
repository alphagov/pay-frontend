const StatsD = require('hot-shots')
const gcStats = require('@sematext/gc-stats')
const eventLoopStats = require('event-loop-stats')

const gcTypes = {
  1: 'minor',
  2: 'major',
  4: 'incremental',
  8: 'weak',
  15: 'all'
}

class PayMetrics {
  constructor (applicationName, { host = 'localhost', port = '8125', mockServer = false, eventLoopInterval = 5000 }) {
    this._statsdClient = new StatsD({
      host: host,
      port: port,
      prefix: `${applicationName}.`,
      mock: mockServer
    })

    this.eventLoopInterval = eventLoopInterval
  }

  async increment (metricName) {
    this._statsdClient.increment(metricName)
  }

  async decrement (metricName) {
    this._statsdClient.decrement(metricName)
  }

  async gauge (metricName, value) {
    this._statsdClient.gauge(metricName, value)
  }

  startSendingNodeMetrics () {
    this._startSendingEventLoopMetrics()
    this._startSendingGCMetrics()
  }

  _startSendingEventLoopMetrics () {
    setInterval(function sendEventLoopMetrics () {
      const stats = eventLoopStats.sense()
      this.gauge('event_loop.max_loop_ms', stats.max)
      this.gauge('event_loop.min_loop_ms', stats.min)
      this.gauge('event_loop.total_loop_ms', stats.sum)
      this.gauge('event_loop.loops_executed', stats.num)
    }.bind(this), this.eventLoopInterval)
  }

  _startSendingGCMetrics () {
    gcStats().on('stats', function sendGCMetrics (gcStats) {
      // available stats https://www.npmjs.com/package/gc-stats#property-insights
      this.gauge(this._gcMetricName('pause_ms', gcStats.gctype), gcStats.pauseMS)
      this.gauge(this._gcMetricName('after.totalHeapSize', gcStats.gctype), gcStats.after.totalHeapSize)
    }.bind(this))
  }

  _gcMetricName (metric, gcType) {
    return `gc.${gcTypes[gcType]}.${metric}`
  }
}

module.exports.PayMetrics = PayMetrics
