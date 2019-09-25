'use strict'

// Core dependencies
const path = require('path')

// NPM dependencies
const proxyquire = require('proxyquire')
const sinon = require('sinon')
const expect = require('chai').expect

const chargeId = '42mdrsshtsk4chpeoifhlgf4lk'

const card = {
  'brand': 'visa',
  'type': 'CREDIT',
  'corporate': false,
  'prepaid': 'NOT_PREPAID'
}

const chargeData = {
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
    'email_collection_mode': 'OFF',
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
  let paymentDetails

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
        service: {
          collectBillingAddress: true
        }

      }
    }
    paymentDetails = {
      'chargeId': chargeId,
      'cardNo': '4242424242424242',
      'expiryMonth': '01',
      'expiryYear': '20',
      'cardholderName': 'Joe Bloggs',
      'cvc': '111',
      'addressCountry': 'GB',
      'addressLine1': '1 Horse Guards',
      'addressCity': 'London',
      'addressPostcode': 'E1 8QS'
    }
  })

  it('should send worldpay_3ds_flex_ddc_result to connector when the request includes a worldpay3dsFlexDdcResult parameter', async function () {
    paymentDetails['worldpay3dsFlexDdcResult'] = 'a-worldpay-3ds-flex-ddc-result'
    const request = {
      chargeData: chargeData,
      body: paymentDetails,
      chargeId: chargeId,
      header: sinon.spy(),
      headers: {
        'x-request-id': 'unique-id'
      }
    }
    await requireChargeController(mockedConnectorClient).create(request, response)
    expect(chargeAuthStub.calledWith(sinon.match( // eslint-disable-line
      {
        'chargeId': chargeId,
        'payload': {
          'card_number': paymentDetails.cardNo,
          'cvc': paymentDetails.cvc,
          'card_brand': card.brand,
          'expiry_date': `${paymentDetails.expiryMonth}/${paymentDetails.expiryYear}`,
          'cardholder_name': paymentDetails.cardholderName,
          'card_type': card.type,
          'corporate_card': card.corporate,
          'prepaid': card.prepaid,
          'address': {
            'line1': paymentDetails.addressLine1,
            'city': paymentDetails.addressCity,
            'postcode': paymentDetails.addressPostcode,
            'country': paymentDetails.addressCountry
          },
          'worldpay_3ds_flex_ddc_result': paymentDetails.worldpay3dsFlexDdcResult
        }
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
        'x-request-id': 'unique-id'
      }
    }
    await requireChargeController(mockedConnectorClient).create(request, response)
    expect(chargeAuthStub.calledWith(sinon.match( // eslint-disable-line
      {
        'chargeId': chargeId,
        'payload': {
          'card_number': paymentDetails.cardNo,
          'cvc': paymentDetails.cvc,
          'card_brand': card.brand,
          'expiry_date': `${paymentDetails.expiryMonth}/${paymentDetails.expiryYear}`,
          'cardholder_name': paymentDetails.cardholderName,
          'card_type': card.type,
          'corporate_card': card.corporate,
          'prepaid': card.prepaid,
          'address': {
            'line1': paymentDetails.addressLine1,
            'city': paymentDetails.addressCity,
            'postcode': paymentDetails.addressPostcode,
            'country': paymentDetails.addressCountry
          }
        }
      }
    ))).to.be.true // eslint-disable-line
  })
})
