// this is to get a one dimensional array of the routes,
// so we can infer the pathname from the req route path

module.exports = function(paths){
  'use strict';

  var flattenObject = function(paths) {
    var flattenedPaths = {};
    for (var controllerName in paths) {
      if(paths.hasOwnProperty(controllerName)) {
        var controller = paths[controllerName];
        if (typeof controller !== 'object') continue;
        for (var actionName in controller) {
          if (controller.hasOwnProperty(actionName)) {
            var action = controller[actionName];
            flattenedPaths[action.path + "_" + action.action] = `${controllerName}.${actionName}`;
          }
        }
      }
    }
    return flattenedPaths;
  };
  return flattenObject(paths);
};
