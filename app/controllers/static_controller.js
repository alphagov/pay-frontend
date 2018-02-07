'use strict'
// npm dependencies
const logger = require('winston')

// local dependencies
const views = require('../utils/views.js')
const withAnalyticsError = require('../utils/analytics.js').withAnalyticsError

exports.privacy = (req, res) => res.render('static/privacy')
exports.humans = (req, res) => views.display(res, 'HUMANS', withAnalyticsError())
exports.naxsi_error = (req, res) => {
  logger.error('NAXSI ERROR:- ' + req.headers['x-naxsi_sig'])
  views.display(res, 'NAXSI_SYSTEM_ERROR', withAnalyticsError())
}
