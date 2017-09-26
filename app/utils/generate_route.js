const _ = require('lodash')
const querystring = require('querystring')

module.exports = function (paths) {
  return function (actionName, params) {
    let route = _.result(paths, actionName).path
    const copiedParams = _.cloneDeep(params)

    _.forEach(copiedParams, function (value, key) {
      const hasNamedParam = route.indexOf(':' + key) !== -1
      if (!hasNamedParam) return

      route = route.replace(':' + key, value)
      copiedParams[key] = undefined
    })

    const query = constructQueryString(copiedParams)
    return route + query
  }
}

function constructQueryString (copiedParams) {
  const validParams = _.omitBy(copiedParams, _.isEmpty, _.isUndefined)
  if (Object.keys(validParams).length === 0) return ''
  return ['?', querystring.stringify(validParams)].join('')
}
