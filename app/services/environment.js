'use strict'

const os = require('os')

/**
 * @return {Number} Number of node workers in cluster
 */
exports.getWorkerCount = () => process.env.NODE_WORKER_COUNT || os.cpus().length || 1
