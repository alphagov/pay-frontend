const paymentFixtures = require('./../../fixtures/payment_fixtures')
const serviceFixtures = require('./../../fixtures/service_fixtures')

const JSONRequestHeader = { 'Accept': 'application/json' }
const JSONResponseHeader = { 'Content-Type': 'application/json' }

const simpleStubBuilder = function simpleStubBuilder (method, statusCode, path, body) {
  return [{
    predicates: [{
      equals: {
        method,
        path,
        headers: JSONRequestHeader
      }
    }],
    responses: [{
      is: {
        statusCode,
        headers: JSONResponseHeader,
        body
      }
    }]
  }]
}

module.exports = {
  connectorCreateChargeFromToken: (opts = {}) => {
    const path = `/v1/frontend/tokens/${opts.tokenId}/charge`
    const body = paymentFixtures.validChargeCreatedByToken(opts)

    return simpleStubBuilder('GET', 200, path, body)
  },

  connectorDeleteToken: (opts = {}) => {
    const path = `/v1/frontend/tokens/${opts.tokenId}`

    return simpleStubBuilder('DELETE', 204, path, undefined)
  },

  connectorUpdateChargeStatus: (opts = {}) => {
    const path = `/v1/frontend/charges/${opts.chargeId}/status`

    return simpleStubBuilder('PUT', 204, path, undefined)
  },

  // @TODO(sfount) this should only match the query string with the - service ID provided
  adminUsersGetService: (opts = {}) => {
    const path = '/v1/api/services'
    const body = serviceFixtures.validServiceResponse(opts).getPlain()

    return simpleStubBuilder('GET', 200, path, body)
  },

  connectorGetChargeDetails: (opts = {}) => {
    const path = `/v1/frontend/charges/${opts.chargeId}`
    const body = paymentFixtures.validChargeDetails(opts)

    return simpleStubBuilder('GET', 200, path, body)
  },

  // this is going to Card ID
  cardIdValidCardDetails: (opts = {}) => {
    const body = paymentFixtures.validCardDetails()
    const stub = {
      predicates: [{
        equals: {
          method: 'POST',
          path: '/v1/api/card',
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

  connectorValidPatchConfirmedChargeDetails: (opts = {}) => {
    const path = `/v1/frontend/charges/${opts.chargeId}`
    const body = paymentFixtures.validChargeDetails({
      chargeId: opts.chargeId,
      status: 'ENTERING CARD DETAILS',
      state: { finished: false, status: 'started' }
    })

    return simpleStubBuilder('PATCH', 200, path, body)
  },

  connectorPostValidChargeCardDetailsAuthorisation: (opts = {}) => {
    const path = `/v1/frontend/charges/${opts.chargeid}/cards`
    const body = paymentFixtures.validChargeCardDetailsAuthorised()

    return simpleStubBuilder('POST', 200, path, body)
  },

  connectorMultipleSubsequentChargeDetails: ([ firstChargeOpts, secondChargeOpts ]) => {
    const firstChargeBody = paymentFixtures.validChargeDetails(firstChargeOpts)
    const secondChargeBody = paymentFixtures.validChargeDetails(secondChargeOpts)

    const stub = {
      predicates: [{
        equals: {
          method: 'GET',
          path: `/v1/frontend/charges/${firstChargeOpts.chargeId}`,
          headers: JSONRequestHeader
        }
      }],
      responses: [{
        is: {
          statusCode: 200,
          headers: JSONResponseHeader,
          body: firstChargeBody
        },
        _behaviours: {
          repeat: 1
        }
      }, {
        is: {
          statusCode: 200,
          headers: JSONResponseHeader,
          body: secondChargeBody
        }
      }]
    }
    return [ stub ]
  },

  connectorPostValidCaptureCharge: (opts = {}) => {
    const path = `/v1/frontend/charges/${opts.chargeId}/capture`

    return simpleStubBuilder('POST', 204, path, undefined)
  }
}
