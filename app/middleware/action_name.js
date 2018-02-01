'use strict'

var paths = require('./../paths.js')
var flatPaths = require('./../utils/flattened_paths.js')(paths)

module.exports = function (req, res, next) {
  'use strict'

  var method = Object.keys(req.route.methods)[0]
  req.actionName = flatPaths[req.route.path + '_' + method]
  next()
}
