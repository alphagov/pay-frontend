'use strict'
// i18n’s built in translation function `__()` returns the key
// if it can’t find a translation. This is problematic as we show
// something gross like 'cardDetails.title' to the user.
// So this is a custom function that will check that the string
// doesn’t equal the key. And if it does throw an error so the
// template fails to render but with a nice helpful error message.

// NPM dependencies
const i18n = require('i18n')

module.exports = function payGetTranslation (req, res, next) {
  res.locals.__p = function safelyTranslateKeys () {
    const translation = i18n.__.apply(req, arguments)
    if (arguments[0] === translation) {
      throw new Error(`Template is missing a translation with ID: ${translation}`)
    }
    return translation
  }
  next()
}
