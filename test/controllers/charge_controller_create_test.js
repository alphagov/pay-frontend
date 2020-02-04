'use strict'

// Core dependencies
const path = require('path')

// Local dependencies
const paymentFixtures = require('../fixtures/payment_fixtures')

// NPM dependencies
const proxyquire = require('proxyquire')
const sinon = require('sinon')
const expect = require('chai').expect

const chargeId = '42mdrsshtsk4chpeoifhlgf4lk'
const card = paymentFixtures.validCardDetails()
const chargeData = paymentFixtures.validChargeDetails({ emailCollectionMode: 'OFF' }).getPlain()

const paymentDetails = {
  chargeId: chargeId,
  cardNo: '4242424242424242',
  expiryMonth: '01',
  expiryYear: '20',
  cardholderName: 'Joe Bloggs',
  cvc: '111',
  addressCountry: 'GB',
  addressLine1: '1 Horse Guards',
  addressCity: 'London',
  addressPostcode: 'E1 8QS'
}

const mockedChargeValidationBackend = function () {
  const validation = {
    hasError: false
  }
  return {
    verify: () => {
      return Promise.resolve({ validation, card })
    }
  }
}

const requireChargeController = function (mockedConnectorClient) {
  const proxyquireMocks = {
    '../utils/charge_validation_backend': mockedChargeValidationBackend,
    '../services/clients/connector_client': mockedConnectorClient
  }
  return proxyquire(path.join(__dirname, '/../../app/controllers/charge_controller.js'), proxyquireMocks)
}

describe('POST /card_details/{chargeId} endpoint', function () {
  let response
  let chargeAuthStub
  let mockedConnectorClient

  beforeEach(() => {
    chargeAuthStub = sinon.stub().resolves(
      {
        statusCode: 200,
        body: {
          status: 'AUTHORISATION SUCCESS'
        }
      })
    mockedConnectorClient = sinon.stub().callsFake(() => {
      return {
        chargeAuth: chargeAuthStub
      }
    })
    response = {
      redirect: sinon.spy(),
      locals: {
        collectBillingAddress: true
      }
    }
  })

  it('should send worldpay_3ds_flex_ddc_result to connector when the request includes a worldpay3dsFlexDdcResult parameter', async function () {
    paymentDetails.worldpay3dsFlexDdcResult = 'a-worldpay-3ds-flex-ddc-result'
    const request = {
      chargeData: chargeData,
      body: paymentDetails,
      chargeId: chargeId,
      header: sinon.spy(),
      headers: {
        'x-request-id': 'unique-id',
        'x-forwarded-for': '127.0.0.1'
      }
    }

    await requireChargeController(mockedConnectorClient).create(request, response)

    const payload = paymentFixtures.validAuthorisationRequest({
      cardNumber: paymentDetails.cardNo,
      cvc: paymentDetails.cvc,
      cardBrand: card.brand,
      expiryDate: `${paymentDetails.expiryMonth}/${paymentDetails.expiryYear}`,
      cardholderName: paymentDetails.cardholderName,
      cardType: card.type,
      corporateCard: card.corporate,
      prepaid: card.prepaid,
      addressLine1: paymentDetails.addressLine1,
      addressCity: paymentDetails.addressCity,
      addressPostcode: paymentDetails.addressPostcode,
      addressCountry: paymentDetails.addressCountry,
      worldpay3dsFlexDdcResult: paymentDetails.worldpay3dsFlexDdcResult
    }).getPlain()

    delete payload.accept_header
    delete payload.user_agent_header

    expect(chargeAuthStub.calledWith(sinon.match( // eslint-disable-line
      {
        chargeId: chargeId,
        payload: payload
      }
    ))).to.be.true // eslint-disable-line
  })

  it('should not send worldpay_3ds_flex_ddc_result to connector when the request does not include a worldpay3dsFlexDdcResult parameter', async function () {
    const request = {
      chargeData: chargeData,
      body: paymentDetails,
      chargeId: chargeId,
      header: sinon.spy(),
      headers: {
        'x-request-id': 'unique-id',
        'x-forwarded-for': '127.0.0.1'
      }
    }
    await requireChargeController(mockedConnectorClient).create(request, response)

    const payload = paymentFixtures.validAuthorisationRequest({
      cardNumber: paymentDetails.cardNo,
      cvc: paymentDetails.cvc,
      cardBrand: card.brand,
      expiryDate: `${paymentDetails.expiryMonth}/${paymentDetails.expiryYear}`,
      cardholderName: paymentDetails.cardholderName,
      cardType: card.type,
      corporateCard: card.corporate,
      prepaid: card.prepaid,
      addressLine1: paymentDetails.addressLine1,
      addressCity: paymentDetails.addressCity,
      addressPostcode: paymentDetails.addressPostcode,
      addressCountry: paymentDetails.addressCountry
    }).getPlain()

    delete payload.accept_header
    delete payload.user_agent_header

    expect(chargeAuthStub.calledWith(sinon.match( // eslint-disable-line
      {
        chargeId: chargeId,
        payload: payload
      }
    ))).to.be.true // eslint-disable-line
  })

  it('should not include billing address in authorisation request when billing address collection disabled', async function () {
    response.locals.collectBillingAddress = false

    const request = {
      chargeData: chargeData,
      body: paymentDetails,
      chargeId: chargeId,
      header: sinon.spy(),
      headers: {
        'x-request-id': 'unique-id',
        'x-forwarded-for': '127.0.0.1'
      }
    }
    await requireChargeController(mockedConnectorClient).create(request, response)

    const payload = paymentFixtures.validAuthorisationRequest({
      cardNumber: paymentDetails.cardNo,
      cvc: paymentDetails.cvc,
      cardBrand: card.brand,
      expiryDate: `${paymentDetails.expiryMonth}/${paymentDetails.expiryYear}`,
      cardholderName: paymentDetails.cardholderName,
      cardType: card.type,
      corporateCard: card.corporate,
      prepaid: card.prepaid,
      noBillingAddress: true
    }).getPlain()

    delete payload.accept_header
    delete payload.user_agent_header

    console.log('PAYLOAD ' + JSON.stringify(payload))

    expect(chargeAuthStub.calledWith(sinon.match( // eslint-disable-line
      {
        chargeId: chargeId,
        payload: payload
      }
    ))).to.be.true // eslint-disable-line
  })
})
