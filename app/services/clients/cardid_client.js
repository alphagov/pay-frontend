'use strict'

// local dependencies
const baseClient = require('./base_client/base_client')

// constants
const baseUrl = process.env.CARDID_HOST
const url = '/v1/api/card'
const description = 'check card'
const service = 'cardid'

module.exports = {
  /**
     *
     * @param args
     * @param subSegment
     *
     * @returns {Request}
     */
  post: (args, subSegment) => {
    return baseClient.post(
      {
        baseUrl,
        url,
        body: args.body,
        correlationId: args.correlationId,
        json: true,
        description,
        service,
        subSegment
      })
  }
}
