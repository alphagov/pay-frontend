var paths      = require(__dirname + '/../paths.js');
var flatPaths  = require(__dirname + '/../utils/flattened_paths.js')(paths);

module.exports = function(req, res, next){
  var method = Object.keys(req.route.methods)[0];
  req.actionName = flatPaths[req.route.path + "_" + method];
  next();
}
