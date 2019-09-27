'use strict'

// NPM dependencies
const urlParse = require('url').parse // eslint-disable-line
const _ = require('lodash')

// Constants
const { FORWARD_PROXY_URL } = process.env

module.exports.addProxy = function addProxy (url) {
  const parsedUrl = urlParse(url)

  if (FORWARD_PROXY_URL) {
    const parsedProxyUrl = urlParse(FORWARD_PROXY_URL)
    parsedUrl.protocol = parsedProxyUrl.protocol
    return _.merge(parsedUrl, _.pick(parsedProxyUrl, ['hostname', 'port', 'protocol']))
  }
  return parsedUrl
}
