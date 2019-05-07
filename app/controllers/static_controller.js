'use strict'

// Local dependencies
const logger = require('../../config/logger')
const responseRouter = require('../utils/response_router')
const withAnalyticsError = require('../utils/analytics').withAnalyticsError

exports.humans = (req, res) => responseRouter.response(req, res, 'HUMANS', withAnalyticsError())

exports.naxsi_error = (req, res) => {
  logger.error('NAXSI ERROR:- ' + req.headers['x-naxsi_sig'])
  responseRouter.response(req, res, 'NAXSI_SYSTEM_ERROR', withAnalyticsError())
}
