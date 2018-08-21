'use strict'

// local dependencies
const i18n = require('i18n')

module.exports = function (req, res, next) {
  res.locals.translationStrings = JSON.stringify(i18n.getCatalog('en'))
  next()
}
