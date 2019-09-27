'use strict'
// this is to get a one dimensional array of the routes,
// so we can infer the pathname from the req route path

module.exports = paths => {
  const flattenedPaths = {}
  for (const controllerName in paths) {
    if (paths.hasOwnProperty(controllerName)) { // eslint-disable-line
      const controller = paths[controllerName]
      if (typeof controller !== 'object') continue
      for (const actionName in controller) {
        if (controller.hasOwnProperty(actionName)) { // eslint-disable-line
          const action = controller[actionName]
          flattenedPaths[`${action.path}_${action.action}`] = `${controllerName}.${actionName}`
        }
      }
    }
  }
  return flattenedPaths
}
