'use strict'

// NPM dependencies
const _ = require('lodash')
const nock = require('nock')
const logger = require('../../app/utils/logger')(__filename)
const proxyquire = require('proxyquire')

// Local dependencies
const cookie = require('../test-helpers/session')
const helper = require('../test-helpers/test-helpers')
const {
  postChargeRequest,
  defaultConnectorResponseForGetCharge,
  defaultAdminusersResponseForGetService
} = helper
const State = require('../../config/state')

// Constants
const app = proxyquire('../../server.js',
  {
    'memory-cache': {
      get: function () {
        return false
      },
      '@global': true
    }
  }).getApp()

let mockServer

const gatewayAccount = {
  gatewayAccountId: '12345',
  paymentProvider: 'epdq',
  analyticsId: 'test-1234',
  type: 'test'
}

const chargeId = '23144323'
const gatewayAccountId = gatewayAccount.gatewayAccountId

const connectorChargePath = '/v1/frontend/charges/'
const frontendCardDetailsPath = '/card_details'

const mockSuccessCardIdResponse = function () {
  nock(process.env.CARDID_HOST)
    .post('/v1/api/card', () => {
      return true
    })
    .reply(200, {
      brand: 'visa',
      label: 'Visa',
      type: 'D',
      corporate: false,
      prepaid: 'NOT_PREPAID'
    })
}

const cardNumber = '4000056655665556'
const cvc = '123'
const expiryMonth = '12'
const expiryYear = '25'
const cardholderName = 'Jimi Hendrix'
const addressLine1 = '32 Whip Ma Whop Ma Avenue'
const addressLine2 = ''
const addressCity = 'London'
const addressPostcode = 'Y1 1YN'
const addressCountry = 'GB'
const jsNavigatorLanguage = 'en-GB'
const jsScreenColorDepth = '24'
const jsScreenHeight = '900'
const jsScreenWidth = '1440'
const jsTimezoneOffsetMins = '-60'

const formSubmissionData = {
  chargeId: chargeId,
  cardNo: cardNumber,
  cvc: cvc,
  expiryMonth: expiryMonth,
  expiryYear: expiryYear,
  cardholderName: cardholderName,
  addressLine1: addressLine1,
  addressLine2: addressLine2,
  addressPostcode: addressPostcode,
  addressCity: addressCity,
  email: 'payer@example.test',
  addressCountry: addressCountry,
  jsNavigatorLanguage: jsNavigatorLanguage,
  jsScreenColorDepth: jsScreenColorDepth,
  jsScreenHeight: jsScreenHeight,
  jsScreenWidth: jsScreenWidth,
  jsTimezoneOffsetMins: jsTimezoneOffsetMins
}

const expectedDataSentToConnector = {
  card_number: cardNumber,
  cvc: cvc,
  card_brand: 'visa',
  expiry_date: expiryMonth + '/' + expiryYear,
  cardholder_name: cardholderName,
  card_type: 'DEBIT',
  corporate_card: false,
  prepaid: 'NOT_PREPAID',
  address: {
    line1: addressLine1,
    line2: addressLine2,
    city: addressCity,
    postcode: addressPostcode,
    country: addressCountry
  },
  js_navigator_language: jsNavigatorLanguage,
  js_screen_color_depth: jsScreenColorDepth,
  js_screen_height: jsScreenHeight,
  js_screen_width: jsScreenWidth,
  js_timezone_offset_mins: jsTimezoneOffsetMins,
  ip_address: '127.0.0.1'
}

function connectorExpects (data) {
  return mockServer.post(connectorChargePath + chargeId + '/cards', body => {
    // Strip non body data (header data) before comparing
    delete body.accept_header
    delete body.user_agent_header
    console.log('COMPARING: ')
    console.log(JSON.stringify(body))
    console.log('WITH: ')
    console.log(JSON.stringify(data))
    console.log('RETURNING: ' + _.isEqual(body, data))
    return _.isEqual(body, data)
  })
}

describe('Enter card details page — sending ePDQ 3DS2 additional data to connector', function () {
  beforeEach(function () {
    nock.cleanAll()
    mockServer = nock(process.env.CONNECTOR_HOST)
  })

  before(function () {
    // Disable logging.
    logger.level = 'none'
  })

  it('should send card data including all ePDQ 3DS2 additional data', function (done) {
    const cookieValue = cookie.create(chargeId)

    nock(process.env.CONNECTOR_HOST)
      .patch('/v1/frontend/charges/' + chargeId)
      .reply(200)
    defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
    defaultAdminusersResponseForGetService(gatewayAccountId)
    mockSuccessCardIdResponse()

    connectorExpects(expectedDataSentToConnector).reply(200)

    postChargeRequest(app, cookieValue, formSubmissionData, chargeId)
      .expect(303)
      .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
      .end(done)
  })

  it('should send card data including ePDQ 3DS2 additional data without jsScreenColorDepth', function (done) {
    const cookieValue = cookie.create(chargeId)

    nock(process.env.CONNECTOR_HOST)
      .patch('/v1/frontend/charges/' + chargeId)
      .reply(200)
    defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
    defaultAdminusersResponseForGetService(gatewayAccountId)
    mockSuccessCardIdResponse()

    delete expectedDataSentToConnector.js_screen_color_depth
    connectorExpects(expectedDataSentToConnector).reply(200)

    delete formSubmissionData.jsScreenColorDepth
    postChargeRequest(app, cookieValue, formSubmissionData, chargeId)
      .expect(303)
      .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
      .end(done)
  })
})
