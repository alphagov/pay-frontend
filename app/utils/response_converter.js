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
        context.promise.reject({error: error})
        return
      }

      if (response && SUCCESS_CODES[response.statusCode] !== null) {
        if (body && transformer && typeof transformer === 'function') {
          context.promise.resolve(transformer(body))
        } else {
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
