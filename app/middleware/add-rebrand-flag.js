'use strict'

module.exports = function (req, res, next) {
  res.locals.enableRebrand = (process.env.ENABLE_REBRAND === 'true')
  next()
}
