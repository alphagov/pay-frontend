'use strict'

// Constants
const SUCCESS_CODES = [200, 201, 202, 204, 206]

/**
 * Creates function that can be used to handle most http success/fail code logic
 * as well as handling the transformation of responses
 *
 * @private
 * @param {Object} context
 * @param {function} transformer
 * @returns {function}
 */
const baseClientResponseHandler = (context, transformer) => {
  return responseOrError => {
    if (responseOrError instanceof Error) {
      context.reject(responseOrError)
    } else if (responseOrError && SUCCESS_CODES.includes(responseOrError.statusCode)) {
      if (responseOrError.body && typeof transformer === 'function') {
        context.resolve(transformer(responseOrError.body))
      } else {
        context.resolve(responseOrError.body)
      }
    } else {
      context.reject(
        new Error(`An http non-success code (${responseOrError.statusCode}) was returned: ${responseOrError.body}`))
    }
  }
}

module.exports = {
  baseClientResponseHandler
}
