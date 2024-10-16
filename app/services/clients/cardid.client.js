'use strict'

// Local dependencies
const { Client } = require('@govuk-pay/pay-js-commons/lib/utils/axios-base-client/axios-base-client')
const { configureClient } = require('./base/config')

// Constants
const CARD_URL = process.env.CARDID_HOST + '/v1/api/card'
const client = new Client('cardid')

/**
 *
 * @param args
 *
 * @returns {Request}
 */

exports.post = async (args) => {
  try {
    configureClient(client, CARD_URL, args.correlationId)
    const response = await client.post(CARD_URL, args.payload, 'card id')
    return response
  } catch (err) {
    return { status: err.errorCode }
  }
}
exports.CARD_URL = CARD_URL
