'use strict'

const responseRouter = require('../utils/response-router')

module.exports = {
  defaultErrorHandler (err, req, res, next) {
    if (res.headersSent) {
      return next(err)
    }
    responseRouter.systemErrorResponse(req, res, 'Unhandled error caught by the default error handler', err)
  }
}
