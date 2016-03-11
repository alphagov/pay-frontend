// this is to get a one dimensional array of the routes,
// so we can infer the pathname from the req route path
var _  = require('lodash');

module.exports = function(paths){
  // https://gist.github.com/penguinboy/762197
  var flattenObject = function(ob) {
  var toReturn = {};
  for (var i in ob) {
    if (!ob.hasOwnProperty(i)) continue;

    if ((typeof ob[i]) == 'object') {
      var flatObject = flattenObject(ob[i]);
      for (var x in flatObject) {
        if (!flatObject.hasOwnProperty(x)) continue;

        toReturn[i + '.' + x] = flatObject[x];
      }
    } else {
      toReturn[i] = ob[i];
    }
  }
  return toReturn;
};

  return _.invert(flattenObject(paths))
}




