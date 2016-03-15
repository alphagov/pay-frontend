// this is to get a one dimensional array of the routes,
// so we can infer the pathname from the req route path
var _  = require('lodash');

module.exports = function(paths){
  var flattenObject = function(paths) {
    flattenedPaths = {};
    for (var controllerName in paths) {
      var controller = paths[controllerName];
      if (typeof controller !== 'object') continue;
      for (var actionName in controller) {
        var action = controller[actionName];
        flattenedPaths[action.path + "_" + action.action] = `${controllerName}.${actionName}`
      }
    }
    return flattenedPaths;
  };
  return flattenObject(paths);
}
