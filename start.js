(function () {
  'use strict'
  var path = require('path')

  // START - HEAP / APM / BLOCKING INSTRUMENTATION
  const memwatch = require('memwatch-next')
  const heapdump = require('heapdump')
  // const blocked = require('blocked-at')
  require('newrelic')

  // Be careful with this - heap analysis shows lots of strings in memory relating to this module which
  // might in turn be creating memory leak alerts
  // blocked((time, stack) => {
  //   console.log('BLOCKED (start)----------------------------------------------')
  //   console.log(`Blocked for ${time}ms, operation started here:`, stack)
  //   console.log('BLOCKED (start)----------------------------------------------')
  // })

  memwatch.on('leak', (info) => {
    console.error('START ---------------------> Memory leak detected:\n', info)
    heapdump.writeSnapshot((err, filename) => {
      if (err) console.error(err)
      else console.error('START ---------------------> Wrote snapshot: ' + filename)
    })
  })

  // require('./heapdump.js').init(path.join(__dirname, '/heap_snapshots'))

  // END - HEAP / APM / BLOCKING INSTRUMENTATION

  var fs = require('fs')
  var logger = require('pino')()
  var throng = require('throng')
  var server = require('./server')
  var environment = require('./app/services/environment')
  var pidFile = path.join(__dirname, '/.start.pid')
  var fileOptions = { encoding: 'utf-8' }
  var pid

  /**
   * throng is a wrapper around node cluster
   * https://github.com/hunterloftis/throng
   */
  function start () {
    throng({
      workers: environment.getWorkerCount(),
      master: startMaster,
      start: startWorker
    })
  }

  /**
   * Start master process
   */
  function startMaster () {
    logger.info(`Master started. PID: ${process.pid}`)
    process.on('SIGINT', () => {
      logger.info(`Master exiting`)
      process.exit()
    })
  }

  /**
   * Start cluster worker. Log start and exit
   * @param  {Number} workerId
   */
  function startWorker (workerId) {
    server.start()

    logger.info(`Started worker ${workerId}, PID: ${process.pid}`)

    process.on('SIGINT', () => {
      logger.info(`Worker ${workerId} exiting...`)
      process.exit()
    })
  }

  /**
   * Make sure all child processes are cleaned up
   */
  function onInterrupt () {
    pid = fs.readFileSync(pidFile, fileOptions)
    fs.unlink(pidFile)
    process.kill(pid, 'SIGTERM')
    process.exit()
  }

  /**
   * Keep track of processes, and clean up on SIGINT
   */
  function monitor () {
    fs.writeFileSync(pidFile, process.pid, fileOptions)
    process.on('SIGINT', onInterrupt)
  }

  monitor()

  start()
}())
