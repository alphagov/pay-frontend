(function () {
  'use strict';

  var fs = require('fs'),
    cluster = require('cluster'),
    logger = require('winston'),
    chalk = require('chalk'),
    throng = require('throng'),
    server = require('./server'),
    grunt = require('grunt'),
    environment = require('./app/services/environment'),
    gruntFilePath = __dirname + '/Gruntfile.js';

  /**
   * Use grunt to run app so that we can use watch, nodemon etc
   */
  function startInDevMode () {
    grunt.cli({
      gruntfile: gruntFilePath
    });
  }

  /**
   * throng is a wrapper around node cluster
   * https://github.com/hunterloftis/throng
   */
  function startInProductionMode () {
    throng({
      workers: environment.getWorkerCount(),
      master: startMaster,
      start: startWorker
    });
  }

  /**
   * Start master process
   */
  function startMaster() {
    logger.info(chalk.green('Master started'));
  }

  /**
   * Start cluster worker. Log start and exit
   * @param  {Number} workerId 
   */
  function startWorker (workerId) {
    server.start();

    logger.info(chalk.blue(`Started worker ${ workerId }`));

    process.on('SIGTERM', () => {
      logger.info(chalk.red(`Worker ${ workerId } exiting...`));
      process.exit()
    });
  }

  // Default to dev mode
  if (environment.isProduction()) {
    startInProductionMode();
  } else {
    startInDevMode();
  }
}());
