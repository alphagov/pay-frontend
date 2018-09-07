'use strict'

// local dependencies
const baseClient = require('./base_client2')

// constants
const CARD_URL = process.env.CARDID_HOST + '/v1/api/card'

/**
 *
 * @param args
 * @param callBack
 *
 * @returns {Request}
 */
exports.post = (args, callBack, subSegment) => baseClient.post(CARD_URL, args, callBack, subSegment)
exports.CARD_URL = CARD_URL
