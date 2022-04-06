'use strict'

require('expose-gc')

const { expect } = require('chai')
const { PayMetrics } = require('../../app/metrics/pay-metrics.js')

describe('PayMetrics library', () => {
  let payMetrics
  let mockStatsdBuffer

  describe('when sending node internal metrics', () => {
    beforeEach(() => {
      payMetrics = new PayMetrics('unit_tests', { mockServer: true, eventLoopInterval: 10 })
      mockStatsdBuffer = payMetrics._statsdClient.mockBuffer
      payMetrics.startSendingNodeMetrics()
    })

    it('sends gc stats', async () => {
      global.gc()

      // I hate this! I have to wait for the gc to complete (within milliseconds) but also of the event loop stats
      // interval to pass
      await new Promise(resolve => setTimeout(resolve, 15))

      const gcStats = mockStatsdBuffer.filter(stat => stat.startsWith('unit_tests.gc'))
      expect(gcStats[0]).to.match(/^unit_tests.gc.major.pause_ms:[0-9]+|g$/)
      expect(gcStats[1]).to.match(/^unit_tests.gc.major.after.totalHeapSize:[0-9]+|g$/)

      const eventLoopStats = mockStatsdBuffer.filter(stat => stat.startsWith('unit_tests.event_loop'))
      expect(eventLoopStats[0]).to.match(/^unit_tests.event_loop.max_loop_ms:[0-9]+|g$/)
      expect(eventLoopStats[1]).to.match(/^unit_tests.event_loop.min_loop_ms:[0-9]+|g$/)
      expect(eventLoopStats[2]).to.match(/^unit_tests.event_loop.total_loop_ms:[0-9]+|g$/)
      expect(eventLoopStats[3]).to.match(/^unit_tests.event_loop.loops_executed:[0-9]+|g$/)
    })
  })

  describe('when not sending node internal metrics', () => {
    beforeEach(() => {
      payMetrics = new PayMetrics('unit_tests', { mockServer: true })
      mockStatsdBuffer = payMetrics._statsdClient.mockBuffer
    })

    it('increments a statsd counter', async () => {
      await payMetrics.increment('test_counter')

      expect(mockStatsdBuffer).to.eql([
        'unit_tests.test_counter:1|c'
      ])
    })

    it('decrements a statsd counter', async () => {
      await payMetrics.decrement('test_counter')

      expect(mockStatsdBuffer).to.eql([
        'unit_tests.test_counter:-1|c'
      ])
    })

    it('sets a statsd gauge', async () => {
      await payMetrics.gauge('test_gauge', 999)

      expect(mockStatsdBuffer).to.eql([
        'unit_tests.test_gauge:999|g'
      ])
    })

    it('sets the host to be localhost and port to 8125', () => {
      expect(payMetrics._statsdClient.host).to.equal('localhost')
      expect(payMetrics._statsdClient.port).to.equal('8125')
    })
  })

  describe('when overriding the default statsd host settings', () => {
    it('sets the statsd host and port and prefix', () => {
      payMetrics = new PayMetrics('unit_tests_host', { host: '192.168.0.1', port: '1234', mockServer: true })

      expect(payMetrics._statsdClient.prefix).to.equal('unit_tests_host.')
      expect(payMetrics._statsdClient.host).to.equal('192.168.0.1')
      expect(payMetrics._statsdClient.port).to.equal('1234')
    })
  })
})
