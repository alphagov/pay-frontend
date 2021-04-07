'use strict'

// Local dependencies
const baseClient = require('./base.client/base.client')

// Constants
const CARD_URL = process.env.CARDID_HOST + '/v1/api/card'

/**
 *
 * @param args
 *
 * @returns {Request}
 */
exports.post = (args) => baseClient.post(CARD_URL, args, null)
exports.CARD_URL = CARD_URL
