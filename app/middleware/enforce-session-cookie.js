'use strict'

const withAnalyticsError = require('../utils/analytics').withAnalyticsError
const responseRouter = require('../utils/response-router')
const { validateSessionCookie } = require('../utils/session')

module.exports = (req, res, next) => {
  if (!validateSessionCookie(req)) {
    responseRouter.response(req, res, 'UNAUTHORISED', withAnalyticsError())
  } else {
    next()
  }
}
