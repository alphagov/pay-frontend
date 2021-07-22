'use strict'

// NPM dependencies
const proxyquire = require('proxyquire')
const sinon = require('sinon')
const expect = require('chai').expect

// Local dependencies
require('../test-helpers/html-assertions')

const mockCharge = (function () {
  const mock = function (shouldSuccess, error) {
    return function () {
      const updateToEnterDetails = function () {
        return {
          then: function (success, fail) {
            return shouldSuccess ? success() : fail()
          }
        }
      }
      const capture = function () {
        return {
          then: function (success, fail) {
            return shouldSuccess ? success() : fail(error)
          }
        }
      }
      return {
        updateToEnterDetails: updateToEnterDetails,
        capture: capture
      }
    }
  }

  return {
    mock: mock
  }
}())

const mockNormalise = (function () {
  const mock = function (chargeObject) {
    return {
      charge: function (data) {
        return chargeObject
      }
    }
  }

  return {
    withCharge: mock
  }
}())

const mockSession = (function () {
  const retrieve = function () {
    return [{
      brand: 'visa',
      debit: true,
      credit: false
    }]
  }

  return {
    retrieve: retrieve
  }
}())

const aChargeWithStatus = function (status) {
  return {
    externalId: 'dh6kpbb4k82oiibbe4b9haujjk',
    status: status,
    amount: '4.99',
    paymentProvider: 'sandbox',
    gatewayAccount: {
      serviceName: 'Service Name',
      analyticsId: 'test-1234',
      type: 'test'
    },
    id: '3'
  }
}

const requireChargeController = function (mockedCharge, mockedNormalise, mockedConnectorClient, mockedCard) {
  const proxyquireMocks = {
    '../services/clients/connector.client': mockedConnectorClient,
    '../models/charge.js': mockedCharge,
    '../services/normalise-charge.js': mockedNormalise,
    '../utils/session.js': mockSession,
    '../services/example-card-expiry-date.js': {
      getFutureYearAs2Digits: () => '20'
    },
    '../services/worldpay-3ds-flex.service': {
      getDdcJwt: () => Promise.resolve('a-jwt')
    }
  }

  if (mockedCard) {
    proxyquireMocks['../models/card.js'] = mockedCard
  }

  return proxyquire('../../app/controllers/charge.controller.js', proxyquireMocks)
}

describe('card details endpoint', function () {
  let request, response, mockedConnectorClient

  const aResponseWithStatus = function (status) {
    return {
      externalId: 'dh6kpbb4k82oiibbe4b9haujjk',
      status: status,
      gatewayAccount: {
        serviceName: 'Service Name',
        analyticsId: 'test-1234',
        type: 'test'
      },
      analytics: {
        analyticsId: 'test-1234',
        type: 'test',
        paymentProvider: 'sandbox'
      },
      worldpay3dsFlexDdcJwt: 'a-jwt'
    }
  }
  before(function () {
    request = {
      query: { debitOnly: false },
      frontend_state: {},
      params: { chargeTokenId: 1 },
      headers: { 'x-request-id': 'unique-id' }
    }

    response = {
      redirect: sinon.spy(),
      render: sinon.spy(),
      status: sinon.spy()
    }

    mockedConnectorClient = sinon.stub()
  })

  it('should not call update to enter card details if charge is already in ENTERING CARD DETAILS', async function () {
    const mockedNormalisedCharge = aChargeWithStatus('ENTERING CARD DETAILS')
    const mockedNormalise = mockNormalise.withCharge(mockedNormalisedCharge)
    // To make sure this test does not proceed to chargeModel.updateToEnterDetails.
    // That is to differentiate from next test.
    const emptyChargeModel = {}

    const expectedCharge = aResponseWithStatus('ENTERING CARD DETAILS')
    await requireChargeController(emptyChargeModel, mockedNormalise, mockedConnectorClient).new(request, response)
    expect(response.render.called).to.be.true // eslint-disable-line
    expect(response.render.calledWithMatch('charge', expectedCharge)).to.be.true // eslint-disable-line
  })

  it('should update to enter card details if charge is in CREATED', async function () {
    const charge = mockCharge.mock(true)

    const mockedNormalisedCharge = aChargeWithStatus('CREATED')
    const mockedNormalise = mockNormalise.withCharge(mockedNormalisedCharge)

    const expectedCharge = aResponseWithStatus('CREATED')
    await requireChargeController(charge, mockedNormalise, mockedConnectorClient).new(request, response)
    expect(response.render.calledWithMatch('charge', expectedCharge)).to.be.true // eslint-disable-line
  })

  it('should display NOT FOUND if updateToEnterDetails returns error', async function () {
    const charge = mockCharge.mock(false)

    const mockedNormalisedCharge = aChargeWithStatus('CREATED')
    const mockedNormalise = mockNormalise.withCharge(mockedNormalisedCharge)

    await requireChargeController(charge, mockedNormalise, mockedConnectorClient).new(request, response)
    const systemErrorObj = {
      message: 'Page cannot be found',
      viewName: 'NOT_FOUND',
      analytics: {
        analyticsId: 'Service unavailable',
        type: 'Service unavailable',
        paymentProvider: 'Service unavailable',
        amount: '0.00'
      }
    }
    expect(response.render.calledWith('error', systemErrorObj)).to.be.true // eslint-disable-line
  })

  it('should display SYSTEM_ERROR if capture returns an error', function () {
    const charge = mockCharge.mock(false, { message: 'some error' })

    const mockedNormalisedCharge = aChargeWithStatus('CAPTURE_READY')
    const mockedNormalise = mockNormalise.withCharge(mockedNormalisedCharge)

    requireChargeController(charge, mockedNormalise, mockedConnectorClient).capture(request, response)
    const systemErrorObj = {
      viewName: 'SYSTEM_ERROR',
      returnUrl: '/return/3',
      analytics: {
        analyticsId: 'test-1234',
        type: 'test',
        paymentProvider: 'sandbox',
        path: '/card_details/3/error',
        amount: '4.99',
        testingVariant: 'original'
      }
    }
    expect(response.render.calledWith('errors/system-error', systemErrorObj)).to.be.true // eslint-disable-line
  })

  it('should display CAPTURE_FAILURE if capture returns a capture failed error', function () {
    const charge = mockCharge.mock(false, { message: 'CAPTURE_FAILED' })

    const mockedNormalisedCharge = aChargeWithStatus('CAPTURE_READY')
    const mockedNormalise = mockNormalise.withCharge(mockedNormalisedCharge)

    requireChargeController(charge, mockedNormalise, mockedConnectorClient).capture(request, response)
    const systemErrorObj = {
      viewName: 'CAPTURE_FAILURE',
      analytics: {
        analyticsId: 'test-1234',
        type: 'test',
        paymentProvider: 'sandbox',
        path: '/card_details/3/capture_failure',
        amount: '4.99',
        testingVariant: 'original'
      }
    }
    expect(response.render.calledWith('errors/incorrect-state/capture-failure', systemErrorObj)).to.be.true // eslint-disable-line
  })
})

describe('check card endpoint', function () {
  const mockedCard = function (allowedCards, correlationId) {
    const card = {
      brand: 'VISA',
      type: 'CREDIT',
      corporate: true,
      prepaid: 'NOT_PREPAID'
    }

    return {
      checkCard: (cardNo, language) => {
        return Promise.resolve(card)
      }
    }
  }

  let request, response

  it('should return accepted with corporate credit card', function (done) {
    const charge = mockCharge.mock(true)

    const mockedNormalisedCharge = aChargeWithStatus('CREATED')
    const mockedNormalise = mockNormalise.withCharge(mockedNormalisedCharge)

    request = {
      headers: {
        'x-request-id': '1537873066.725'
      },
      chargeData: {
        language: 'en',
        gateway_account: {
          card_types: [
            {
              id: 'c2683cfc-07b3-47c4-b7ff-5552d3b2f1e6',
              brand: 'visa',
              label: 'Visa',
              type: 'DEBIT',
              requires3ds: false
            },
            {
              id: 'b41ce0fe-c381-43aa-a5d5-77af61cd9baf',
              brand: 'visa',
              label: 'Visa',
              type: 'CREDIT',
              requires3ds: false
            }
          ]
        }
      },
      body: {
        cardNo: '4242424242424242'
      }
    }
    response = {
      json: (data) => {
        expect(data).to.deep.equal({ accepted: true, corporate: true, type: 'CREDIT', prepaid: 'NOT_PREPAID' })
        done()
      }
    }

    requireChargeController(charge, mockedNormalise, sinon.stub(), mockedCard).checkCard(request, response)
  })
})
