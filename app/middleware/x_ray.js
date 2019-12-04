'use strict'

// NPM dependencies
const { getNamespace } = require('continuation-local-storage')

// Local dependencies
const { NAMESPACE_NAME, XRAY_SEGMENT_KEY_NAME } = require('../../config/cls')

module.exports = (req, res, next) => {
  const namespace = getNamespace(NAMESPACE_NAME)
  namespace.set(XRAY_SEGMENT_KEY_NAME, req.segment)
  next()
}
