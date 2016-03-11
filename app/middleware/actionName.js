var paths      = require(__dirname + '/../paths.js');
var flatPaths  = require(__dirname + '/../utils/flattened_paths.js')(paths);

module.exports = function(req, res, next){
  req.actionName = flatPaths[req.route.path];
  next();
}
