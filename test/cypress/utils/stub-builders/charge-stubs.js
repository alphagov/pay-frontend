'use strict'

const { stubBuilder } = require('./stub-builder')
const paymentFixtures = require('../../../fixtures/payment.fixtures')
const worldpay3dsFlexDdcJwtFixtures = require('../../../fixtures/worldpay-3ds-flex.fixtures')

const JSONResponseHeader = { 'Content-Type': 'application/json' }

function connectorMultipleSubsequentChargeDetails (...chargesArr) {
  const charges = Array.prototype.concat.apply([], chargesArr) // flatten as charges is in the form [[charge1, charge2]]
  const responseArray = []
  responseArray.push({
    is: {
      statusCode: 200,
      headers: JSONResponseHeader,
      body: paymentFixtures.validChargeDetails(charges[0])
    },
    _behaviours: {
      repeat: 1
    }
  })
  charges.shift()
  charges.forEach(charge => {
    responseArray.push({
      is: {
        statusCode: 200,
        headers: JSONResponseHeader,
        body: paymentFixtures.validChargeDetails(charge)
      }
    })
  })

  const stub = {
    predicates: [{
      equals: {
        method: 'GET',
        path: `/v1/frontend/charges/${charges[0].chargeId}`
      }
    }],
    responses: responseArray
  }
  return stub
}

function connectorValidPatchConfirmedChargeDetails (chargeId) {
  const path = `/v1/frontend/charges/${chargeId}`
  const response = paymentFixtures.validChargeDetails({
    chargeId: chargeId,
    status: 'ENTERING CARD DETAILS',
    state: { finished: false, status: 'started' }
  })
  return stubBuilder('PATCH', path, 200, { response })
}

function connectorGetChargeDetails (opts) {
  const path = `/v1/frontend/charges/${opts.chargeId}`
  return stubBuilder('GET', path, 200, {
    response: paymentFixtures.validChargeDetails(opts)
  })
}

function connectorCancelCharge (chargeId) {
  const path = `/v1/frontend/charges/${chargeId}/cancel`
  return stubBuilder('POST', path, 204)
}

function connectorUpdateChargeStatus (chargeId) {
  const path = `/v1/frontend/charges/${chargeId}/status`
  return stubBuilder('PUT', path, 204)
}

function connectorGetChargeDetailsWithPrefilledCardholderDetails (opts) {
  const path = `/v1/frontend/charges/${opts.chargeId}`
  return stubBuilder('GET', path, 200, {
    response: paymentFixtures.validChargeDetailsWithPrefilledCardHolderDetails(opts)
  })
}

function connectorWorldpay3dsFlexDdcJwt (chargeId) {
  const path = `/v1/frontend/charges/${chargeId}/worldpay/3ds-flex/ddc`
  return stubBuilder('GET', path, 200, {
    response: worldpay3dsFlexDdcJwtFixtures.validDdcJwt()
  })
}

function connectorPostValidChargeCardDetailsAuthorisation (chargeId) {
  const path = `/v1/frontend/charges/${chargeId}/cards`
  return stubBuilder('POST', path, 200, {
    response: paymentFixtures.validChargeCardDetailsAuthorised()
  })
}

function connectorPostValidCaptureCharge (chargeId) {
  const path = `/v1/frontend/charges/${chargeId}/capture`
  return stubBuilder('POST', path, 204)
}

module.exports = {
  connectorMultipleSubsequentChargeDetails,
  connectorValidPatchConfirmedChargeDetails,
  connectorGetChargeDetails,
  connectorCancelCharge,
  connectorUpdateChargeStatus,
  connectorGetChargeDetailsWithPrefilledCardholderDetails,
  connectorWorldpay3dsFlexDdcJwt,
  connectorPostValidChargeCardDetailsAuthorisation,
  connectorPostValidCaptureCharge
}
