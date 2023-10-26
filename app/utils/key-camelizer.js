'use strict'

function convertToCamelCase (objectKey) {
  const camelizedString = objectKey.replace(/[-_\s]+(.)?/g, (match, chr) => chr ? chr.toUpperCase() : '')
  return camelizedString.substr(0, 1).toLowerCase() + camelizedString.substr(1)
}

function separateWords (objectKey) {
  const options = {}
  const separator = options.separator || '_'
  const split = options.split || /(?=[A-Z])/
  return objectKey.split(split).join(separator).toLowerCase()
};

function camelize (obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => camelize(item))
  } else if (typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      if (obj[key] === null) {
        result[convertToCamelCase(key)] = null
      } else if (typeof obj[key] === 'object') {
        result[convertToCamelCase(key)] = camelize(obj[key])
      } else {
        result[convertToCamelCase(key)] = obj[key]
      }
      return result
    }, {})
  } else {
    return obj
  }
}

function decamelize (obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => decamelize(item))
  } else if (typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      if (obj[key] === null) {
        result[separateWords(key)] = null
      } else if (typeof obj[key] === 'object') {
        result[separateWords(key)] = decamelize(obj[key])
      } else {
        result[separateWords(key)] = obj[key]
      }
      return result
    }, {})
  } else {
    return obj
  }
};

module.exports = {
  camelize,
  decamelize
}
