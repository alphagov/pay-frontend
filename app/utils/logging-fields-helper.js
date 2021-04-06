'use strict'

const setLoggingField = function setLoggingField (req, key, value) {
  if (!req.commonLoggingFields) {
    req.commonLoggingFields = {}
  }
  req.commonLoggingFields[key] = value
}

const getLoggingFields = function getLoggingFields (req) {
  return req.commonLoggingFields || {}
}

module.exports = {
  setLoggingField,
  getLoggingFields
}
