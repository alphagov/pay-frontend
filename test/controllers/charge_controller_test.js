'use strict'

// Core dependencies
const path = require('path')

// NPM dependencies
const proxyquire = require('proxyquire')
const sinon = require('sinon')
const expect = require('chai').expect
const AWSXRay = require('aws-xray-sdk')

// Local dependencies
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

const requireChargeController = function (mockedCharge, mockedNormalise, mockedConnectorClient, mockedCard) {
  const proxyquireMocks = {
    '../services/clients/connector_client': mockedConnectorClient,
    '../models/charge.js': mockedCharge,
    '../services/normalise_charge.js': mockedNormalise,
    '../utils/session.js': mockSession,
    '../services/worldpay_3ds_flex_service': {
      getDdcJwt: () => Promise.resolve('a-jwt')
    },
    'aws-xray-sdk': {
      captureAsyncFunc: function (name, callback) {
        callback({ close: () => { } }) // eslint-disable-line
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
  let request, response, mockedConnectorClient

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
      },
      'worldpay3dsFlexDdcJwt': 'a-jwt'
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

  describe('POST /card_details/{chargeId}', function () {
    it('worldpay 3ds flex ddc result sent to connector when present in the post body', async function () {

    })

    it('worldpay 3ds flex ddc result not present', async function () {
      request = {
        chargeData: {
          'amount': 100,
          'return_url': 'https://example.com',
          'description': 'a description',
          'language': 'en',
          'links': [],
          'status': 'ENTERING CARD DETAILS',
          'gateway_account': {
            'version': 1,
            'requires3ds': false,
            'live': false,
            'gateway_account_id': 1,
            'payment_provider': 'sandbox',
            'type': 'test',
            'service_name': 'My service',
            'allow_google_pay': false,
            'allow_apple_pay': false,
            'corporate_prepaid_credit_card_surcharge_amount': 0,
            'corporate_prepaid_debit_card_surcharge_amount': 0,
            'allow_zero_amount': false,
            'integration_version_3ds': 1,
            'email_notifications': {
              'REFUND_ISSUED': {
                'version': 1,
                'enabled': true,
                'template_body': null
              },
              'PAYMENT_CONFIRMED': {
                'version': 1,
                'enabled': true,
                'template_body': null
              }
            },
            'email_collection_mode': 'MANDATORY',
            'card_types': [
              {
                'id': '9827003e-a9a6-42c3-806c-f8530ad5cf19',
                'brand': 'visa',
                'label': 'Visa',
                'type': 'DEBIT',
                'requires3ds': false
              }
            ],
            'gateway_merchant_id': null,
            'corporate_credit_card_surcharge_amount': 0,
            'corporate_debit_card_surcharge_amount': 0
          }
        },
        body: {
          'chargeId': '42mdrsshtsk4chpeoifhlgf4lk',
          'csrfToken': 'C6E5AySO-LdcOqTOK4LleMCVViBmlkzmiCt4',
          'cardNo': '4242424242424242',
          'expiryMonth': '01',
          'expiryYear': '20',
          'cardholderName': 'Joe Bloggs',
          'cvc': '111',
          'addressCountry': 'GB',
          'addressLine1': '1 Horse Guards',
          'addressCity': 'London',
          'addressPostcode': 'SE16 4JR',
          'email': 'oswald.quek@digital.cabinet-office.gov.uk'
        }
      }

      // const charge = mockCharge.mock(true)
      // await requireChargeController(charge, mockedNormalise, mockedConnectorClient).create(request, response)
    })
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
    const charge = mockCharge.mock(false, { message: 'some error' })

    const mockedNormalisedCharge = aChargeWithStatus('CAPTURE_READY')
    const mockedNormalise = mockNormalise.withCharge(mockedNormalisedCharge)

    requireChargeController(charge, mockedNormalise, mockedConnectorClient).capture(request, response)
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
    const charge = mockCharge.mock(false, { message: 'CAPTURE_FAILED' })

    const mockedNormalisedCharge = aChargeWithStatus('CAPTURE_READY')
    const mockedNormalise = mockNormalise.withCharge(mockedNormalisedCharge)

    requireChargeController(charge, mockedNormalise, mockedConnectorClient).capture(request, response)
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
      corporate: true,
      prepaid: 'NOT_PREPAID'
    }

    return {
      checkCard: (cardNo, language, subSegment) => {
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
        expect(data).to.deep.equal({ accepted: true, corporate: true, type: 'CREDIT', prepaid: 'NOT_PREPAID' })
        done()
      }
    }

    requireChargeController(charge, mockedNormalise, sinon.stub(), mockedCard).checkCard(request, response)
  })
})
