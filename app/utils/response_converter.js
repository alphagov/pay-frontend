const requestLogger = require('../utils/request_logger')

const SUCCESS_CODES = [200, 201, 202, 204, 206]

module.exports = {
  /**
   * Creates a callback that can be used to log the stuff we're interested
   * in and converts the response/error into a promise.
   *
   * @private
   * @param {Object} context
   * @returns {function}
   */
  createCallbackToPromiseConverter: (context, transformer) => {
    return (error, response, body) => {
      requestLogger.logRequestEnd(context)

      if (error) {
        requestLogger.logRequestError(context, error)
        console.log('XXXXXXXXXX createCallbackToPromiseConverterNEW > rejecting')
        context.promise.reject({error: error})
        return
      }

      if (response && SUCCESS_CODES.indexOf(response.statusCode) !== -1) {
        if (body && transformer && typeof transformer === 'function') {
          console.log('XXXXXXXXX createCallbackToPromiseConverterNEW > resolving')
          context.promise.resolve(transformer(body))
        } else {
          console.log('XXXXXXXXXX createCallbackToPromiseConverterNEW > resolving 2')
          context.promise.resolve(body)
        }
      } else {
        requestLogger.logRequestFailure(context, response)
        context.promise.reject({
          errorCode: response.statusCode,
          message: response.body
        })
      }
    }
  },

  successCodes: () => {
    return SUCCESS_CODES
  }
}
