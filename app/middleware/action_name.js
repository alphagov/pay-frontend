var path = require('path')
var paths = require(path.join(__dirname, '/../paths.js'))
var flatPaths = require(path.join(__dirname, '/../utils/flattened_paths.js'))(paths)

module.exports = function (req, res, next) {
  'use strict'

  var method = Object.keys(req.route.methods)[0]
  req.actionName = flatPaths[req.route.path + '_' + method]
  next()
}
