'use strict'

// NPM Dependencies
const request = require('request-promise-native')
const wrapper = require('./wrapper')

// Constants
const {NODE_ENV} = process.env

// Create request.defaults config
const requestOptions = {
  agentOptions: {
    keepAlive: true,
    maxSockets: process.env.MAX_SOCKETS || 100
  },
  json: true,
  resolveWithFullResponse: true,
  maxAttempts: 3,
  retryDelay: 5000,
  rejectUnauthorized: (NODE_ENV === 'production')
}

const client = request.defaults(requestOptions)

// Export base client
module.exports = {
  get: wrapper(client, 'get'),
  post: wrapper(client, 'post'),
  put: wrapper(client, 'put'),
  patch: wrapper(client, 'patch'),
  delete: wrapper(client, 'delete')
}
