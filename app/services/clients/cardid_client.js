'use strict'

// Local dependencies
const baseClient = require('./base_client/base_client')

// Constants
const CARD_URL = process.env.CARDID_HOST + '/v1/api/card'

/**
 *
 * @param args
 *
 * @returns {Request}
 */
exports.post = (args, subSegment) => baseClient.post(CARD_URL, args, null, subSegment)
exports.CARD_URL = CARD_URL
