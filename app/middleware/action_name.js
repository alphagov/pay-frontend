'use strict'

// local dependencies
const paths = require('./../paths.js')
const flatPaths = require('./../utils/flattened_paths.js')(paths)

module.exports = function (req, res, next) {
  req.actionName = flatPaths[`${req.route.path}_${req.method.toLowerCase()}`]
  next()
}
