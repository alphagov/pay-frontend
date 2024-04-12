'use strict'

// Local dependencies
// const baseClient = require('./base.client/base.client')
const { Client } = require('@govuk-pay/pay-js-commons/lib/utils/axios-base-client/axios-base-client')
const { configureClient } = require('./base/config')

// Constants
const CARD_URL = process.env.CARDID_HOST + '/v1/api/card'
const client = new Client('cardid')
configureClient(client, CARD_URL)

/**
 *
 * @param args
 *
 * @returns {Request}
 */

// exports.post = (args) => baseClient.post(CARD_URL, args, null)
exports.post = async (args) => {
  try {
    const response = await client.post(CARD_URL, args.payload, 'card id')
    return response
  } catch (err) {
    return { status: err.errorCode }
  }
}
exports.CARD_URL = CARD_URL
