'use strict'

const lodash = require('lodash')
const querystring = require('querystring')

module.exports = paths => (actionName, params) => {
  const copiedParams = lodash.cloneDeep(params)
  let route = lodash.result(paths, actionName).path

  lodash.forEach(copiedParams, (value, key) => {
    if (route.indexOf(':' + key) < 0) return
    route = route.replace(':' + key, value)
    delete copiedParams[key]
  })
  const query = constructQueryString(copiedParams)
  return route + query
}

function constructQueryString (copiedParams) {
  let validParams = lodash.omitBy(copiedParams, lodash.isEmpty)
  validParams = lodash.omitBy(validParams, lodash.isUndefined)
  if (Object.keys(validParams).length === 0) return ''
  return ['?', querystring.stringify(validParams)].join('')
}
