'use strict'

const os = require('os')

/**
 * @return {Number} Number of node workers in cluster
 */
exports.getWorkerCount = () => os.cpus().length || 1
