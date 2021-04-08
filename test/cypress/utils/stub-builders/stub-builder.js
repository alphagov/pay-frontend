'use strict'

function stubBuilder (method, path, responseCode, additionalParams = {}) {
  const request = {
    method,
    path
  }
  if (additionalParams.request) {
    request.body = additionalParams.request
  }
  if (additionalParams.query) {
    request.query = additionalParams.query
  }

  const response = {
    statusCode: responseCode,
    headers: additionalParams.responseHeaders || { 'Content-Type': 'application/json' }
  }
  if (additionalParams.response) {
    response.body = additionalParams.response
  }

  const stub = {
    name: `${method} ${path} ${responseCode}`,
    predicates: [{ deepEquals: request }],
    responses: [{
      is: response
    }]
  }

  return stub
}

module.exports = {
  stubBuilder
}
