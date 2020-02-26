'use strict'

const logger = require('../utils/logger')(__filename)
const responseRouter = require('../utils/response_router')

module.exports = {
  defaultErrorHandler (err, req, res, next) {
    if (res.headersSent) {
      return next(err)
    }
    logger.warn('Unhandled error caught by the default error handler')
    logger.error(err)
    responseRouter.response(req, res, 'SYSTEM_ERROR')
  }
}
