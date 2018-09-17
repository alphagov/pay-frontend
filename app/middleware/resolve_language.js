'use strict'

// local dependencies
const i18n = require('i18n')

module.exports = function (req, res, next) {
  const language = req.chargeData.language || 'en'
  i18n.setLocale(req, language)
  var startTime = new Date()
  res.locals.translationStrings = JSON.stringify(i18n.getCatalog(language))
  console.log('elapsed time to json stringify i18n.getCatalog: %s ms', new Date() - startTime)
  res.locals.language = language
  next()
}
