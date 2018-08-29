'use strict'

// local dependencies
const i18n = require('i18n')

module.exports = function (req, res, next) {
  const language = req.chargeData.language || 'en'
  i18n.setLocale(req, language)
  res.locals.translationStrings = JSON.stringify(i18n.getCatalog(language))
  res.locals.language = language
  next()
}
