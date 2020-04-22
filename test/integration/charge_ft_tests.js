'use strict'

// NPM dependencies
const _ = require('lodash')
const request = require('supertest')
const nock = require('nock')
const chai = require('chai')
const cheerio = require('cheerio')
const logger = require('../../app/utils/logger')(__filename)
const expect = chai.expect
const proxyquire = require('proxyquire')
const should = chai.should()

// Local dependencies
const cookie = require('../test_helpers/session')
const helper = require('../test_helpers/test_helpers')
const {
  getChargeRequest,
  postChargeRequest,
  defaultConnectorResponseForGetCharge,
  defaultAdminusersResponseForGetService
} = helper
const State = require('../../config/state')
const serviceFixtures = require('../fixtures/service_fixtures')

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

const EMPTY_BODY = ''
const defaultCorrelationHeader = {
  reqheaders: { 'x-request-id': 'some-unique-id' }
}
const gatewayAccount = {
  gatewayAccountId: '12345',
  paymentProvider: 'sandbox',
  analyticsId: 'test-1234',
  type: 'test'
}

let mockServer

const defaultCardID = { brand: 'visa', label: 'visa', type: 'D', corporate: false, prepaid: 'NOT_PREPAID' }

const mockSuccessCardIdResponse = function (data) {
  nock(process.env.CARDID_HOST)
    .post('/v1/api/card', () => {
      return true
    })
    .reply(200, data)
}

const mockSuccessPatchEmail = function (chargeId) {
  nock(process.env.CONNECTOR_HOST)
    .patch(`/v1/frontend/charges/${chargeId}`, () => {
      return true
    })
    .reply(200)
}

describe('chargeTests', function () {
  const localServer = process.env.CONNECTOR_HOST
  const adminUsersHost = process.env.ADMINUSERS_URL

  const servicesResource = '/v1/api/services'
  const connectorChargePath = '/v1/frontend/charges/'
  const chargeId = '23144323'
  const frontendCardDetailsPath = '/card_details'
  const frontendCardDetailsPostPath = '/card_details/' + chargeId
  const gatewayAccountId = gatewayAccount.gatewayAccountId

  const connectorAuthUrl = localServer + connectorChargePath + chargeId + '/cards'
  const enteringCardDetailsState = 'ENTERING CARD DETAILS'
  const RETURN_URL = 'http://www.example.com/service'

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

  function minimumConnectorCardData (cardNumber, cardType = 'DEBIT', corporate = false, cardBrand = 'visa', prepaid = 'NOT_PREPAID') {
    return {
      card_number: cardNumber,
      cvc: '234',
      card_brand: cardBrand,
      expiry_date: '11/99',
      cardholder_name: 'Jimi Hendrix',
      card_type: cardType,
      corporate_card: corporate,
      prepaid: prepaid,
      address: {
        line1: '32 Whip Ma Whop Ma Avenue',
        city: 'Willy wonka',
        postcode: 'Y1 1YN',
        country: 'GB'
      },
      ip_address: '127.0.0.1'
    }
  }

  function fullConnectorCardData (cardNumber) {
    const cardData = minimumConnectorCardData(cardNumber)
    cardData.address.line2 = 'bla bla'
    cardData.address.city = 'London'
    cardData.address.country = 'GB'
    return cardData
  }

  function fullFormCardData (cardNumber) {
    const cardData = minimumFormCardData(cardNumber)
    cardData.addressLine2 = 'bla bla'
    return cardData
  }

  function minimumFormCardData (cardNumber) {
    return {
      returnUrl: RETURN_URL,
      cardUrl: connectorAuthUrl,
      chargeId: chargeId,
      cardNo: cardNumber,
      cvc: '234',
      expiryMonth: '11',
      expiryYear: '99',
      cardholderName: 'Jimi Hendrix',
      addressLine1: '32 Whip Ma Whop Ma Avenue',
      addressPostcode: 'Y1 1YN',
      addressCity: 'Willy wonka',
      email: 'willy@wonka.com',
      addressCountry: 'GB'
    }
  }

  function missingFormCardData () {
    return {
      chargeId: chargeId,
      returnUrl: RETURN_URL
    }
  }

  beforeEach(function () {
    nock.cleanAll()
    mockServer = nock(localServer)
  })

  before(function () {
    // Disable logging.
    logger.level = 'none'
  })

  describe('The /charge endpoint', function () {
    describe('Different statuses', function () {
      function get (status) {
        nock(process.env.CONNECTOR_HOST, defaultCorrelationHeader)
          .get('/v1/frontend/charges/23144323')
          .reply(200, {
            amount: 2345,
            description: 'Payment Description',
            status: status,
            return_url: 'http://www.example.com/service',
            gateway_account: {
              gateway_account_id: gatewayAccountId,
              analytics_id: 'test-1234',
              type: 'test',
              payment_provider: 'sandbox',
              service_name: 'Pranks incorporated',
              card_types: [{
                type: 'CREDIT',
                brand: 'VISA',
                label: 'Visa'
              }]
            },
            service: {
              name: {
                en: 'Pranks incorporated'
              }
            }
          })

        nock(process.env.CONNECTOR_HOST, defaultCorrelationHeader)
          .put('/v1/frontend/charges/23144323/status')
          .reply(204)

        defaultAdminusersResponseForGetService(gatewayAccountId)

        const cookieValue = cookie.create(chargeId)
        return getChargeRequest(app, cookieValue, chargeId)
      }

      function getAndCheckChargeRequest (status, done) {
        get(status)
          .expect(200)
          .expect(function (res) {
            const $ = cheerio.load(res.text)
            expect($('#card-details #csrf').attr('value')).to.not.be.empty // eslint-disable-line
            expect($('#amount').text()).to.eql('£23.45')
            expect($('#payment-description').text()).to.contain('Payment Description')
            expect($('#govuk-script-analytics')[0].children[0].data).to.contains(`init('${gatewayAccount.analyticsId}', '${gatewayAccount.type}', '${gatewayAccount.paymentProvider}', '23.45', '')`)
            expect($('#card-details').attr('action')).to.eql(frontendCardDetailsPostPath)
          })
          .end(done)
      }

      it('should include the data required for the frontend when entering card details', function (done) {
        getAndCheckChargeRequest(enteringCardDetailsState, done)
      })

      it('should include the data required for the frontend when in created state', function (done) {
        getAndCheckChargeRequest('CREATED', done)
      })

      it('should show error page when the charge is not in a state we deal with', function (done) {
        get('invalid')
          .expect(500)
          .expect(function (res) {
            const $ = cheerio.load(res.text)
            expect($('#content #errorMsg').text()).to.eql('There is a problem, please try again later')
          }).end(done)
      })

      it('should show appropriate error page when the charge is in a state we deal with', function (done) {
        get('authorisation success')
          .expect(200)
          .end(done)
      })

      it('should show auth failure page when the authorisation has been rejected', function (done) {
        get('authorisation rejected')
          .expect(200)
          .end(done)
      })

      it('should show auth failure page when the authorisation has been cancelled', function (done) {
        get('authorisation cancelled')
          .expect(200)
          .end(done)
      })
    })

    // TODO - need to split these tests in to smaller files
    describe('Some random grouping -- Needs refactoring :( ', function () {
      it('should redirect user to auth_waiting when connector returns 202', function (done) {
        const cookieValue = cookie.create(chargeId)
        nock(process.env.CONNECTOR_HOST)
          .patch('/v1/frontend/charges/23144323')
          .reply(200)
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)

        mockSuccessCardIdResponse(defaultCardID)

        connectorExpects(minimumConnectorCardData('4242424242424242'))
          .reply(202)

        postChargeRequest(app, cookieValue, minimumFormCardData('4242 4242 4242 4242'), chargeId)
          .expect(303)
          .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/auth_waiting')
          .end(done)
      })

      it('should redirect user to auth_waiting when connector returns 409', function (done) {
        const cookieValue = cookie.create(chargeId)
        nock(process.env.CONNECTOR_HOST)
          .patch('/v1/frontend/charges/23144323')
          .reply(200)
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS)
        defaultAdminusersResponseForGetService(gatewayAccountId)

        nock(adminUsersHost, defaultCorrelationHeader)
          .get(`${servicesResource}?gatewayAccountId=${gatewayAccountId}`)
          .reply(200, serviceFixtures.validServiceResponse({ gateway_account_ids: [gatewayAccountId] }).getPlain())

        mockSuccessCardIdResponse(defaultCardID)

        connectorExpects(minimumConnectorCardData('4242424242424242'))
          .reply(409)

        postChargeRequest(app, cookieValue, minimumFormCardData('4242 4242 4242 4242'), chargeId)
          .expect(303)
          .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/auth_waiting')
          .end(done)
      })

      it('should redirect user to confirm when connector returns 200 for authorisation success', function (done) {
        const cookieValue = cookie.create(chargeId)
        nock(process.env.CONNECTOR_HOST)
          .patch('/v1/frontend/charges/23144323')
          .reply(200)
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)
        mockSuccessCardIdResponse(defaultCardID)

        connectorExpects(minimumConnectorCardData('4242424242424242'))
          .reply(200, { status: State.AUTH_SUCCESS })

        postChargeRequest(app, cookieValue, minimumFormCardData('4242 4242 4242 4242'), chargeId)
          .expect(303)
          .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .end(done)
      })

      it('should send expected card data to connector for the case of a prepaid corporate debit card', function (done) {
        const cookieValue = cookie.create(chargeId)
        nock(process.env.CONNECTOR_HOST)
          .patch('/v1/frontend/charges/23144323')
          .reply(200)
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)
        mockSuccessCardIdResponse({ brand: 'visa', label: 'visa', type: 'D', corporate: true, prepaid: 'PREPAID' })

        connectorExpects(minimumConnectorCardData('4000180000000002', 'DEBIT', true, 'visa', 'PREPAID'))
          .reply(200, { status: State.AUTH_SUCCESS })

        postChargeRequest(app, cookieValue, minimumFormCardData('4000 1800 0000 0002'), chargeId)
          .expect(303)
          .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .end(done)
      })

      it('should send expected card data to connector for the case of a non-prepaid non-corporate credit card', function (done) {
        const cookieValue = cookie.create(chargeId)
        nock(process.env.CONNECTOR_HOST)
          .patch('/v1/frontend/charges/23144323')
          .reply(200)
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)
        mockSuccessCardIdResponse({ brand: 'american-express', label: 'american-express', type: 'C', corporate: false, prepaid: 'NOT_PREPAID' })

        connectorExpects(minimumConnectorCardData('4242424242424242', 'CREDIT', false, 'american-express'))
          .reply(200, { status: State.AUTH_SUCCESS })

        postChargeRequest(app, cookieValue, minimumFormCardData('4242 4242 4242 4242'), chargeId)
          .expect(303)
          .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .end(done)
      })

      it('should redirect user to confirm when connector returns 200 for authorisation and 3DS is required', function (done) {
        const cookieValue = cookie.create(chargeId)
        nock(process.env.CONNECTOR_HOST)
          .patch('/v1/frontend/charges/23144323')
          .reply(200)
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)
        mockSuccessCardIdResponse(defaultCardID)

        connectorExpects(minimumConnectorCardData('4242424242424242'))
          .reply(200, { status: State.AUTH_3DS_REQUIRED })

        postChargeRequest(app, cookieValue, minimumFormCardData('4242 4242 4242 4242'), chargeId)
          .expect(303)
          .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/3ds_required')
          .end(done)
      })

      it('should redirect user from /auth_waiting to /confirm when connector returns a successful status', function (done) {
        const cookieValue = cookie.create(chargeId)
        defaultConnectorResponseForGetCharge(chargeId, State.AUTH_SUCCESS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)

        request(app)
          .get(frontendCardDetailsPath + '/' + chargeId + '/auth_waiting')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .set('Cookie', ['frontend_state=' + cookieValue])
          .set('Accept', 'application/json')
          .expect(303)
          .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .end(done)
      })

      it('should redirect user from /auth_waiting to the returnURL when connector returns a successful status and is web payment (Apple/Google Pay)', function (done) {
        const cookieValue = cookie.create(chargeId)
        const walletType = 'apple-pay'

        nock(process.env.CONNECTOR_HOST)
          .get('/v1/frontend/charges/' + chargeId).reply(200, defaultConnectorResponseForGetCharge(chargeId, State.AUTH_SUCCESS, gatewayAccountId, 'http://www.example.com/service', walletType))
          .post('/v1/frontend/charges/' + chargeId + '/capture').reply(204)
        defaultAdminusersResponseForGetService(gatewayAccountId)

        request(app)
          .get(frontendCardDetailsPath + '/' + chargeId + '/auth_waiting')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .set('Cookie', ['frontend_state=' + cookieValue])
          .set('Accept', 'application/json')
          .expect(303)
          .expect('Location', '/return/' + chargeId)
          .end(done)
      })

      it('should redirect user from /auth_waiting to /3ds_required when connector returns that 3DS is required for authorisation', function (done) {
        const cookieValue = cookie.create(chargeId)
        defaultConnectorResponseForGetCharge(chargeId, State.AUTH_3DS_REQUIRED, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)

        request(app)
          .get(frontendCardDetailsPath + '/' + chargeId + '/auth_waiting')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .set('Cookie', ['frontend_state=' + cookieValue])
          .set('Accept', 'application/json')
          .expect(303)
          .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/3ds_required')
          .end(done)
      })

      it('should keep user in /auth_waiting when connector returns an authorisation ready state', function (done) {
        const cookieValue = cookie.create(chargeId)
        defaultConnectorResponseForGetCharge(chargeId, State.AUTH_READY, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)

        request(app)
          .get(frontendCardDetailsPath + '/' + chargeId + '/auth_waiting')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .set('Cookie', ['frontend_state=' + cookieValue])
          .set('Accept', 'application/json')
          .expect(200)
          .end(done)
      })

      it('should give enter_card_details view page if user is in entering card details state', function (done) {
        const cookieValue = cookie.create(chargeId)
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)

        request(app)
          .get(frontendCardDetailsPath + '/' + chargeId + '/auth_waiting')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .set('Cookie', ['frontend_state=' + cookieValue])
          .set('Accept', 'application/json')
          .expect(200)
          .end(done)
      })

      it('should error without csrf', function (done) {
        const cookieValue = cookie.create(chargeId)
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)

        connectorExpects(minimumConnectorCardData('5105105105105100'))
          .reply(204)
        postChargeRequest(app, cookieValue, minimumFormCardData('5105 1051 0510 5100'), chargeId, false)
          .expect(500)
          .end(done)
      })

      it('should send card data including optional fields to connector', function (done) {
        const cookieValue = cookie.create(chargeId)
        mockSuccessCardIdResponse(defaultCardID)
        nock(process.env.CONNECTOR_HOST)
          .patch('/v1/frontend/charges/23144323')
          .reply(200)
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)

        const cardData = fullConnectorCardData('5105105105105100')

        connectorExpects(cardData).reply(200)

        const formData = minimumFormCardData('5105105105105100')
        formData.addressLine2 = cardData.address.line2
        formData.addressCity = cardData.address.city

        postChargeRequest(app, cookieValue, formData, chargeId)
          .expect(303)
          .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .end(done)
      })

      it('show an error page when authorization was refused', function (done) {
        const cookieValue = cookie.create(chargeId)
        nock(process.env.CONNECTOR_HOST)
          .patch('/v1/frontend/charges/23144323')
          .reply(200)
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)

        mockSuccessCardIdResponse(defaultCardID)

        connectorExpects(minimumConnectorCardData('5105105105105100'))
          .reply(400, { message: 'This transaction was declined.' })

        postChargeRequest(app, cookieValue, minimumFormCardData('5105105105105100'), chargeId)
          .expect(303)
          .expect(function (res) {
            should.equal(res.headers.location, '/card_details/' + chargeId)
          })
          .end(done)
      })

      it('show an error page when the chargeId is not found on the session', function (done) {
        const cookieValue = cookie.create()

        const cardData = minimumConnectorCardData('5105105105105100')
        cardData.address.line2 = 'bla bla'
        cardData.address.city = 'London'
        cardData.address.country = 'GB'

        connectorExpects(cardData).reply(200)

        const formData = minimumFormCardData('5105105105105100')
        formData.addressLine2 = cardData.address.line2
        formData.addressCity = cardData.address.city

        postChargeRequest(app, cookieValue, formData, chargeId)
          .expect(403)
          .end(done)
      })

      it('shows an error when a card is submitted that does not pass the luhn algorithm', function (done) {
        const cookieValue = cookie.create(chargeId)
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)
        mockSuccessCardIdResponse(defaultCardID)
        mockSuccessPatchEmail(chargeId)
        postChargeRequest(app, cookieValue, minimumFormCardData('1111111111111111'), chargeId)
          .expect(200)
          .expect(function (res) {
            const $ = cheerio.load(res.text)
            expect($('#card-details').attr('action')).to.eql(frontendCardDetailsPostPath)
            expect($('#amount').text()).to.eql('£23.45')
            expect($('#card-no-error').text()).to.contains('Enter a valid card number')
            expect($('#error-card-no').text()).to.contains('Enter a valid card number')
          })
          .end(done)
      })

      it('should return country list when invalid fields submitted', (done) => {
        const cookieValue = cookie.create(chargeId, {})
        mockSuccessCardIdResponse(defaultCardID)
        mockSuccessPatchEmail(chargeId)
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)
        postChargeRequest(app, cookieValue, missingFormCardData(), chargeId)
          .expect((res) => {
            const $ = cheerio.load(res.text)
            expect($('#address-country').find('option').length > 0).to.equal(true)
          })
          .end(done)
      })

      it('shows an error when a card is submitted with missing fields', function (done) {
        const cookieValue = cookie.create(chargeId, {})
        mockSuccessCardIdResponse(defaultCardID)
        mockSuccessPatchEmail(chargeId)
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)
        postChargeRequest(app, cookieValue, missingFormCardData(), chargeId)
          .expect(200)
          .expect(function (res) {
            const $ = cheerio.load(res.text)
            expect($('#payment-description').text()).to.contain('Payment Description')
            expect($('#card-details').attr('action')).to.eql(frontendCardDetailsPostPath)
            expect($('#amount').text()).to.eql('£23.45')
            expect($('.withdrawal-text').text()).to.contains('Accepted credit and debit card types')
            expect($('#cancel').attr('action')).to.eql('/card_details/23144323/cancel')
            const errorMessages = {
              cardNo: 'Enter a valid card number',
              expiryDate: 'Enter a valid expiry date',
              cvc: 'Enter a valid card security code',
              city: 'Enter a valid town/city',
              postcode: 'Enter a valid postcode',
              email: 'Enter a valid email',
              country: 'Enter a valid country or territory'
            }
            expect($('#card-no-error').text()).to.contains(errorMessages.cardNo)
            expect($('#error-card-no').text()).to.contains(errorMessages.cardNo)
            expect($('#expiry-date-error').text()).to.contains(errorMessages.expiryDate)
            expect($('#error-expiry-date').text()).to.contains(errorMessages.expiryDate)
            expect($('#cardholder-name-error').text()).to.contains('Enter a valid name')
            expect($('#error-cardholder-name').text()).to.contains('Enter the name as it appears on the card')
            expect($('#cvc-error').text()).to.contains(errorMessages.cvc)
            expect($('#error-cvc').text()).to.contains(errorMessages.cvc)
            expect($('#address-line-1-error').text()).to.contains('Enter a valid building name/number and street')
            expect($('#error-address-line-1').text()).to.contains('Enter a valid billing address')
            expect($('#address-city-error').text()).to.contains(errorMessages.city)
            expect($('#error-address-city').text()).to.contains(errorMessages.city)
            expect($('#address-postcode-error').text()).to.contains(errorMessages.postcode)
            expect($('#error-address-postcode').text()).to.contains(errorMessages.postcode)
            expect($('#email-error').text()).to.contains(errorMessages.email)
            expect($('#error-email').text()).to.contains(errorMessages.email)
            expect($('#address-country-error').text()).to.contains(errorMessages.country)
            expect($('#error-address-country').text()).to.contains(errorMessages.country)
          })
          .end(done)
      })

      it('shows an error when a card is submitted that is not supported', function (done) {
        const cookieValue = cookie.create(chargeId, {})
        nock.cleanAll()
        mockSuccessPatchEmail(chargeId)
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)
        nock(process.env.CARDID_HOST)
          .post('/v1/api/card', () => {
            return true
          })
          .reply(200, { brand: 'foobar', label: 'foobar', type: 'D' })
        postChargeRequest(app, cookieValue, minimumFormCardData('3528000700000000'), chargeId)
          .expect(200)
          .expect(function (res) {
            const $ = cheerio.load(res.text)
            expect($('#payment-description').text()).to.contain('Payment Description')
            expect($('#card-details').attr('action')).to.eql(frontendCardDetailsPostPath)
            expect($('#amount').text()).to.eql('£23.45')
            const errorMessages = {
              cardNo: 'Foobar is not supported'
            }
            expect($('#card-no-error').text()).to.contains(errorMessages.cardNo)
            expect($('#error-card-no').text()).to.contains(errorMessages.cardNo)
          })
          .end(done)
      })

      it('shows an error when a card is submitted that is not supported withdrawal type', function (done) {
        const cookieValue = cookie.create(chargeId, {})
        nock.cleanAll()
        nock(process.env.CARDID_HOST)
          .post('/v1/api/card', () => {
            return true
          })
          .reply(200, { brand: 'american-express', label: 'american express', type: 'D' })
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)
        mockSuccessPatchEmail(chargeId)

        postChargeRequest(app, cookieValue, minimumFormCardData('3528000700000000'), chargeId)
          .expect(200)
          .expect(function (res) {
            const $ = cheerio.load(res.text)
            expect($('#payment-description').text()).to.contain('Payment Description')
            expect($('#card-details').attr('action')).to.eql(frontendCardDetailsPostPath)
            expect($('#amount').text()).to.eql('£23.45')
            const errorMessages = {
              cardNo: 'American Express debit cards are not supported'
            }
            expect($('#card-no-error').text()).to.contains(errorMessages.cardNo)
            expect($('#error-card-no').text()).to.contains(errorMessages.cardNo)
          })
          .end(done)
      })

      it('preserve card fields, cardholder name, address lines and email when a card is submitted with validation errors', function (done) {
        const cookieValue = cookie.create(chargeId, {})
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)
        mockSuccessPatchEmail(chargeId)

        nock(process.env.CARDID_HOST)
          .post('/v1/api/card', () => {
            return true
          })
          .reply(200, { brand: 'visa', label: 'visa', type: 'D' })
        const cardData = fullFormCardData('4242')
        postChargeRequest(app, cookieValue, cardData, chargeId)
          .expect(200)
          .expect(function (res) {
            const $ = cheerio.load(res.text)
            expect($('#card-no').attr('value')).to.eql('4242')
            expect($('#cvc').attr('value')).to.eql('234')
            expect($('#expiry-month').attr('value')).to.eql(cardData.expiryMonth)
            expect($('#expiry-year').attr('value')).to.eql(cardData.expiryYear)
            expect($('#cardholder-name').attr('value')).to.eql(cardData.cardholderName)
            expect($('#address-line-1').attr('value')).to.eql(cardData.addressLine1)
            expect($('#address-line-2').attr('value')).to.eql(cardData.addressLine2)
            expect($('#address-city').attr('value')).to.eql(cardData.addressCity)
            expect($('#address-postcode').attr('value')).to.eql(cardData.addressPostcode)
            expect($('#email').attr('value')).to.eql(cardData.email)
          })
          .end(done)
      })

      it('should ignore empty/null address lines when second address line populated', function (done) {
        const cookieValue = cookie.create(chargeId)
        mockSuccessCardIdResponse(defaultCardID)
        const cardData = minimumConnectorCardData('5105105105105100')
        cardData.address.line1 = 'bla bla'
        delete cardData.address.line3

        nock(process.env.CONNECTOR_HOST)
          .patch('/v1/frontend/charges/23144323')
          .reply(200)
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)

        connectorExpects(cardData).reply(200)
        const formData = minimumFormCardData('5105105105105100')
        formData.addressLine1 = ''
        formData.addressLine2 = cardData.address.line1

        postChargeRequest(app, cookieValue, formData, chargeId)
          .expect(303, EMPTY_BODY)
          .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .end(done)
      })

      it('should ignore empty/null address lines when only second address line populated', function (done) {
        const cookieValue = cookie.create(chargeId)
        mockSuccessCardIdResponse(defaultCardID)
        const cardData = minimumConnectorCardData('5105105105105100')
        cardData.address.line1 = 'bla bla'
        delete cardData.address.line2

        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)

        connectorExpects(cardData).reply(200)
        nock(process.env.CONNECTOR_HOST)
          .patch('/v1/frontend/charges/23144323')
          .reply(200)
        const formData = minimumFormCardData('5105105105105100')
        formData.addressLine1 = ''
        formData.addressLine2 = cardData.address.line1

        postChargeRequest(app, cookieValue, formData, chargeId)
          .expect(303, EMPTY_BODY)
          .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .end(done)
      })

      it('show an error page when the chargeId is not found on the session', function (done) {
        const cookieValue = cookie.create()
        mockSuccessCardIdResponse(defaultCardID)
        mockServer.post(connectorChargePath + chargeId + '/cards', {
          card_number: '5105105105105100',
          cvc: '234',
          expiry_date: '11/99'
        }).reply(400, { message: 'This transaction was declined.' })

        request(app)
          .post(frontendCardDetailsPostPath)
          .set('Cookie', ['frontend_state=' + cookieValue])
          .send({
            chargeId: chargeId,
            cardNo: '5105 1051 0510 5100',
            cvc: '234',
            expiryDate: '11/99'
          })
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .set('Accept', 'application/json')
          .expect(function (res) {
            should.not.exist(res.headers['set-cookie'])
          })
          .expect(403)
          .end(done)
      })
    })
  })
})
