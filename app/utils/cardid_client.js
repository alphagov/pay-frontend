'use strict'

// local dependencies
const baseClient = require('./base_client')

// constants
const CARD_URL = process.env.CARDID_HOST + '/v1/api/card'

/**
 *
 * @param args
 * @param callBack
 *
 * @returns {Request}
 */
exports.post = (args, callBack) => baseClient.post(CARD_URL, args, callBack)
exports.CARD_URL = CARD_URL
