'use strict'

// core dependencies
const path = require('path')

// npm dependencies
const proxyquire = require('proxyquire')
const sinon = require('sinon')
const expect = require('chai').expect
const q = require('q')
const AWSXRay = require('aws-xray-sdk')

// local dependencies
require(path.join(__dirname, '/../test_helpers/html_assertions'))

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
    'externalId': 'dh6kpbb4k82oiibbe4b9haujjk',
    'status': status,
    'amount': '4.99',
    'gatewayAccount': {
      'serviceName': 'Service Name',
      'analyticsId': 'test-1234',
      'type': 'test',
      'paymentProvider': 'sandbox'
    },
    'id': '3'
  }
}

const requireChargeController = function (mockedCharge, mockedNormalise, mockedCard) {
  const proxyquireMocks = {
    '../models/charge.js': mockedCharge,
    '../services/normalise_charge.js': mockedNormalise,
    '../utils/session.js': mockSession,
    'aws-xray-sdk': {
      captureAsyncFunc: function (name, callback) {
        callback({close: () => {}}) // eslint-disable-line
      }
    },
    'continuation-local-storage': {
      getNamespace: function () {
        return {
          get: function () {
            return new AWSXRay.Segment('stub-segment')
          }
        }
      }
    }
  }

  if (mockedCard) {
    proxyquireMocks['../models/card.js'] = mockedCard
  }

  return proxyquire(path.join(__dirname, '/../../app/controllers/charge_controller.js'), proxyquireMocks)
}

describe('card details endpoint', function () {
  let request, response

  const aResponseWithStatus = function (status) {
    return {
      'externalId': 'dh6kpbb4k82oiibbe4b9haujjk',
      'status': status,
      'gatewayAccount': {
        'serviceName': 'Service Name',
        'analyticsId': 'test-1234',
        'type': 'test',
        'paymentProvider': 'sandbox'
      },
      'analytics': {
        'analyticsId': 'test-1234',
        'type': 'test',
        'paymentProvider': 'sandbox'
      }
    }
  }
  before(function () {
    request = {
      query: {debitOnly: false},
      frontend_state: {},
      params: {chargeTokenId: 1},
      headers: {'x-request-id': 'unique-id'}
    }

    response = {
      redirect: sinon.spy(),
      render: sinon.spy(),
      status: sinon.spy()
    }
  })

  it('should not call update to enter card details if charge is already in ENTERING CARD DETAILS', function () {
    const mockedNormalisedCharge = aChargeWithStatus('ENTERING CARD DETAILS')
    const mockedNormalise = mockNormalise.withCharge(mockedNormalisedCharge)
    // To make sure this test does not proceed to chargeModel.updateToEnterDetails.
    // That is to differentiate from next test.
    const emptyChargeModel = {}

    const expectedCharge = aResponseWithStatus('ENTERING CARD DETAILS')
    requireChargeController(emptyChargeModel, mockedNormalise).new(request, response)
    expect(response.render.calledWithMatch('charge', expectedCharge)).to.be.true // eslint-disable-line
  })

  it('should update to enter card details if charge is in CREATED', function () {
    const charge = mockCharge.mock(true)

    const mockedNormalisedCharge = aChargeWithStatus('CREATED')
    const mockedNormalise = mockNormalise.withCharge(mockedNormalisedCharge)

    const expectedCharge = aResponseWithStatus('CREATED')
    requireChargeController(charge, mockedNormalise).new(request, response)
    expect(response.render.calledWithMatch('charge', expectedCharge)).to.be.true // eslint-disable-line
  })

  it('should display NOT FOUND if updateToEnterDetails returns error', function () {
    const charge = mockCharge.mock(false)

    const mockedNormalisedCharge = aChargeWithStatus('CREATED')
    const mockedNormalise = mockNormalise.withCharge(mockedNormalisedCharge)

    requireChargeController(charge, mockedNormalise).new(request, response)
    const systemErrorObj = {
      'message': 'Page cannot be found',
      'viewName': 'NOT_FOUND',
      'analytics': {
        'analyticsId': 'Service unavailable',
        'type': 'Service unavailable',
        'paymentProvider': 'Service unavailable',
        'amount': '0.00'
      }
    }
    expect(response.render.calledWith('error', systemErrorObj)).to.be.true // eslint-disable-line
  })

  it('should display SYSTEM_ERROR if capture returns an error', function () {
    const charge = mockCharge.mock(false, {message: 'some error'})

    const mockedNormalisedCharge = aChargeWithStatus('CAPTURE_READY')
    const mockedNormalise = mockNormalise.withCharge(mockedNormalisedCharge)

    requireChargeController(charge, mockedNormalise).capture(request, response)
    const systemErrorObj = {
      'viewName': 'SYSTEM_ERROR',
      'returnUrl': '/return/3',
      'analytics': {
        'analyticsId': 'test-1234',
        'type': 'test',
        'paymentProvider': 'sandbox',
        'path': '/card_details/3/error',
        'amount': '4.99',
        'testingVariant': 'original'
      }
    }
    expect(response.render.calledWith('errors/system_error', systemErrorObj)).to.be.true // eslint-disable-line
  })

  it('should display CAPTURE_FAILURE if capture returns a capture failed error', function () {
    const charge = mockCharge.mock(false, {message: 'CAPTURE_FAILED'})

    const mockedNormalisedCharge = aChargeWithStatus('CAPTURE_READY')
    const mockedNormalise = mockNormalise.withCharge(mockedNormalisedCharge)

    requireChargeController(charge, mockedNormalise).capture(request, response)
    const systemErrorObj = {
      'viewName': 'CAPTURE_FAILURE',
      'analytics': {
        'analyticsId': 'test-1234',
        'type': 'test',
        'paymentProvider': 'sandbox',
        'path': '/card_details/3/capture_failure',
        'amount': '4.99',
        'testingVariant': 'original'
      }
    }
    expect(response.render.calledWith('errors/incorrect_state/capture_failure', systemErrorObj)).to.be.true // eslint-disable-line
  })
})

describe('check card endpoint', function () {
  const mockedCard = function (allowedCards, correlationId) {
    let card = {
      brand: 'VISA',
      type: 'CREDIT',
      corporate: true
    }

    return {
      checkCard: (cardNo, language, subSegment) => {
        const defer = q.defer()

        defer.resolve(card)

        return defer.promise
      }
    }
  }

  let request, response

  it('should return accepted with corporate credit card', function (done) {
    const charge = mockCharge.mock(true)

    const mockedNormalisedCharge = aChargeWithStatus('CREATED')
    const mockedNormalise = mockNormalise.withCharge(mockedNormalisedCharge)

    request = {
      'headers': {
        'x-request-id': '1537873066.725'
      },
      'chargeData': {
        'language': 'en',
        'gateway_account': {
          'card_types': [
            {
              'id': 'c2683cfc-07b3-47c4-b7ff-5552d3b2f1e6',
              'brand': 'visa',
              'label': 'Visa',
              'type': 'DEBIT',
              'requires3ds': false
            },
            {
              'id': 'b41ce0fe-c381-43aa-a5d5-77af61cd9baf',
              'brand': 'visa',
              'label': 'Visa',
              'type': 'CREDIT',
              'requires3ds': false
            }
          ]
        }
      },
      body: {
        'cardNo': '4242424242424242'
      }
    }
    response = {
      json: (data) => {
        expect(data).to.deep.equal({accepted: true, corporate: true, type: 'CREDIT'})
        done()
      }
    }

    requireChargeController(charge, mockedNormalise, mockedCard).checkCard(request, response)
  })
})
