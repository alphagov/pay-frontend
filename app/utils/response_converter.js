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
    return (data, status) => {
      requestLogger.logRequestEnd(context)
      if (data && SUCCESS_CODES[data.statusCode] !== null) {
        if (status && transformer && typeof transformer === 'function') {
          context.promise.resolve(transformer(status))
        } else {
          context.promise.resolve(status)
        }
      } else {
        requestLogger.logRequestFailure(context, data)
        context.promise.reject({
          errorCode: data.statusCode,
          message: data.body
        })
      }
      context = null
    }
  },
  successCodes: () => {
    return SUCCESS_CODES
  }
}
