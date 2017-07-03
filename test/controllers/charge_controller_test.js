var path = require('path')
require(path.join(__dirname, '/../test_helpers/html_assertions.js'))
var proxyquire = require('proxyquire')
var sinon = require('sinon')
var expect = require('chai').expect

var mockCharge = (function () {
  var mock = function (shouldSuccess, error) {
    return function () {
      var updateToEnterDetails = function () {
        return {
          then: function (success, fail) {
            return shouldSuccess ? success() : fail()
          }
        }
      }
      var capture = function () {
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

var mockNormalise = (function () {
  var mock = function (chargeObject) {
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

var mockSession = (function () {
  var retrieve = function () {
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

var requireChargeController = function (mockedCharge, mockedNormalise) {
  return proxyquire(path.join(__dirname, '/../../app/controllers/charge_controller.js'), {
    '../models/charge.js': mockedCharge,
    '../services/normalise_charge.js': mockedNormalise,
    '../utils/session.js': mockSession
  })
}

describe('card details endpoint', function () {
  var request, response

  var aChargeWithStatus = function (status) {
    return {
      'externalId': 'dh6kpbb4k82oiibbe4b9haujjk',
      'status': status,
      'gatewayAccount': {
        'serviceName': 'Service Name',
        'analyticsId': 'test-1234',
        'type': 'test',
        'paymentProvider': 'sandbox'
      },
      'id': '3'
    }
  }

  var aResponseWithStatus = function (status) {
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
    var mockedNormalisedCharge = aChargeWithStatus('ENTERING CARD DETAILS')
    var mockedNormalise = mockNormalise.withCharge(mockedNormalisedCharge)
    // To make sure this test does not proceed to chargeModel.updateToEnterDetails.
    // That is to differentiate from next test.
    var emptyChargeModel = {}

    var expectedCharge = aResponseWithStatus('ENTERING CARD DETAILS')
    requireChargeController(emptyChargeModel, mockedNormalise).new(request, response)
    expect(response.render.calledWithMatch('charge', expectedCharge)).to.be.true // eslint-disable-line
  })

  it('should update to enter card details if charge is in CREATED', function () {
    var charge = mockCharge.mock(true)

    var mockedNormalisedCharge = aChargeWithStatus('CREATED')
    var mockedNormalise = mockNormalise.withCharge(mockedNormalisedCharge)

    var expectedCharge = aResponseWithStatus('CREATED')
    requireChargeController(charge, mockedNormalise).new(request, response)
    expect(response.render.calledWithMatch('charge', expectedCharge)).to.be.true // eslint-disable-line
  })

  it('should display NOT FOUND if updateToEnterDetails returns error', function () {
    var charge = mockCharge.mock(false)

    var mockedNormalisedCharge = aChargeWithStatus('CREATED')
    var mockedNormalise = mockNormalise.withCharge(mockedNormalisedCharge)

    requireChargeController(charge, mockedNormalise).new(request, response)
    var systemErrorObj = {'message': 'Page cannot be found',
      'viewName': 'NOT_FOUND',
      'analytics': {
        'analyticsId': 'Service unavailable',
        'type': 'Service unavailable',
        'paymentProvider': 'Service unavailable'
      }
    }
    expect(response.render.calledWith('error', systemErrorObj)).to.be.true // eslint-disable-line
  })

  it('should display SYSTEM_ERROR if capture returns an error', function () {
    var charge = mockCharge.mock(false, { message: 'some error' })

    var mockedNormalisedCharge = aChargeWithStatus('CAPTURE_READY')
    var mockedNormalise = mockNormalise.withCharge(mockedNormalisedCharge)

    requireChargeController(charge, mockedNormalise).capture(request, response)
    var systemErrorObj = {
      'viewName': 'SYSTEM_ERROR',
      'returnUrl': '/return/3',
      'analytics': {
        'analyticsId': 'test-1234',
        'type': 'test',
        'paymentProvider': 'sandbox',
        'path': '/card_details/3/error'
      }
    }
    expect(response.render.calledWith('errors/system_error', systemErrorObj)).to.be.true // eslint-disable-line
  })

  it('should display CAPTURE_FAILURE if capture returns a capture failed error', function () {
    var charge = mockCharge.mock(false, { message: 'CAPTURE_FAILED' })

    var mockedNormalisedCharge = aChargeWithStatus('CAPTURE_READY')
    var mockedNormalise = mockNormalise.withCharge(mockedNormalisedCharge)

    requireChargeController(charge, mockedNormalise).capture(request, response)
    var systemErrorObj = {
      'viewName': 'CAPTURE_FAILURE',
      'analytics': {
        'analyticsId': 'test-1234',
        'type': 'test',
        'paymentProvider': 'sandbox',
        'path': '/card_details/3/capture_failure'
      }
    }
    expect(response.render.calledWith('errors/incorrect_state/capture_failure', systemErrorObj)).to.be.true // eslint-disable-line
  })
})
