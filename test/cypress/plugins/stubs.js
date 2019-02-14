// get fixture definitions
const paymentFixtures = require('./../../fixtures/payment_fixtures')

const JSONRequestHeader = { 'Accept': 'application/json' }
const JSONResponseHeader = { 'Content-Type': 'application/json' }

module.exports = {
  getValidChargeCreated: (opts = {}) => {
    const body = paymentFixtures.validChargeCreatedByToken()
    const stub = {
      predicates: [{
        equals: {
          method: 'GET',
          path: `/v1/frontend/tokens/${opts.tokenId}/charge`,
          headers: JSONRequestHeader
        }
      }],
      responses: [{
        is: {
          statusCode: 200,
          headers: JSONResponseHeader,
          body
        }
      }]
    }
    return [ stub ]
  },

  // @TODO(sfount) helper method for removing predicates code would be helpful
  // formatStub(method, url, reponseStatus, responseBody)
  getValidTokenDeleted: (opts = {}) => {
    const body = paymentFixtures.validDeleteToken()
    const stub = {
      predicates: [{
        equals: {
          method: 'DELETE',
          path: `/v1/frontend/tokens/${opts.tokenId}`,
          headers: JSONRequestHeader
        }
      }],
      responses: [{
        is: {
          statusCode: 204,
          headers: JSONResponseHeader,
          body
        }
      }]
    }
    return [ stub ]
  },

  getValidInitialCharge: (opts = {}) => {
    const body = paymentFixtures.validInitialCharge()
    const stub = {
      predicates: [{
        equals: {
          method: 'GET',
          path: `/v1/frontend/charges/${opts.chargeId}`,
          headers: JSONRequestHeader
        }
      }],
      responses: [{
        is: {
          statusCode: 200,
          headers: JSONResponseHeader,
          body
        }
      }]
    }
    return [ stub ]
  },

  putValidInitialChargeStatus: (opts = {}) => {
    const body = paymentFixtures.putValidInitialChargeUpdate()
    const stub = {
      predicates: [{
        equals: {
          method: 'PUT',
          path: `/v1/frontend/charges/${opts.chargeId}/status`,
          headers: JSONRequestHeader
        }
      }],
      responses: [{
        is: {
          statusCode: 204,
          headers: JSONResponseHeader,
          body
        }
      }]
    }
    return [ stub ]
  },

  // @TODO(sfount) this should only match the query string with the
  // service ID provided
  // @TODO(sfount) this is to admin users - should it be somewhere else?
  getValidInitialService: (opts = {}) => {
    const body = paymentFixtures.validInitialService()
    const stub = {
      predicates: [{
        equals: {
          method: 'GET',
          path: '/v1/api/services',
          headers: JSONRequestHeader
        }
      }],
      responses: [{
        is: {
          statusCode: 200,
          headers: JSONResponseHeader,
          body
        }
      }]
    }
    return [ stub ]
  }
}
