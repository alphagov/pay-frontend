'use strict'

function convertToCamelCase (objectKey) {
  const camelizedString = objectKey.replace(/[-_\s]+(.)?/g, (match, chr) => chr ? chr.toUpperCase() : '')
  return camelizedString.substr(0, 1).toLowerCase() + camelizedString.substr(1)
}

function convertToSnakeCase (objectKey, separator = '_', split = /(?=[A-Z])/) {
  return objectKey.split(split).join(separator).toLowerCase()
}

function keysToCamelCase (obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => keysToCamelCase(item))
  } else if (typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      if (obj[key] === null) {
        result[convertToCamelCase(key)] = null
      } else if (typeof obj[key] === 'object') {
        result[convertToCamelCase(key)] = keysToCamelCase(obj[key])
      } else {
        result[convertToCamelCase(key)] = obj[key]
      }
      return result
    }, {})
  } else {
    return obj
  }
}

function keysToSnakeCase (obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => keysToSnakeCase(item))
  } else if (typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      if (obj[key] === null) {
        result[convertToSnakeCase(key)] = null
      } else if (typeof obj[key] === 'object') {
        result[convertToSnakeCase(key)] = keysToSnakeCase(obj[key])
      } else {
        result[convertToSnakeCase(key)] = obj[key]
      }
      return result
    }, {})
  } else {
    return obj
  }
};

module.exports = {
  keysToCamelCase,
  keysToSnakeCase
}
