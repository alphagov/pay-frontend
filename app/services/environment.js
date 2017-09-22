'use strict'

/**
 * @return {Number} Number of node workers in cluster
 */
exports.getWorkerCount = () => process.env.NODE_WORKER_COUNT || 1
