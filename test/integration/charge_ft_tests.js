const EMPTY_BODY = ''

const _ = require('lodash')
const request = require('supertest')
const nock = require('nock')
const app = require('../../server.js').getApp
const mockTemplates = require('../test_helpers/mock_templates.js')
app.engine('html', mockTemplates.__express)
const expect = require('chai').expect

const should = require('chai').should()

const cookie = require('../test_helpers/session.js')
const helper = require('../test_helpers/test_helpers.js')

const {getChargeRequest, postChargeRequest} = require('../test_helpers/test_helpers.js')
const connectorResponseForPutCharge = require('../test_helpers/test_helpers.js').connectorResponseForPutCharge
const {defaultConnectorResponseForGetCharge, defaultAdminusersResponseForGetService} = require('../test_helpers/test_helpers.js')
const State = require('../../app/models/state.js')
const serviceFixtures = require('../fixtures/service_fixtures')

let mockServer

let defaultCardID = function () {
  nock(process.env.CARDID_HOST)
    .post('/v1/api/card', () => {
      return true
    })
    .reply(200, {brand: 'visa', label: 'visa', type: 'D'})
}

let defaultCorrelationHeader = {
  reqheaders: {'x-request-id': 'some-unique-id'}
}

describe('chargeTests', function () {
  let localServer = process.env.CONNECTOR_HOST
  let adminUsersHost = process.env.ADMINUSERS_URL

  const servicesResource = `/v1/api/services`
  let connectorChargePath = '/v1/frontend/charges/'
  let chargeId = '23144323'
  let frontendCardDetailsPath = '/card_details'
  let frontendCardDetailsPostPath = '/card_details/' + chargeId
  const gatewayAccountId = '12345'

  let connectorAuthUrl = localServer + connectorChargePath + chargeId + '/cards'
  let enteringCardDetailsState = 'ENTERING CARD DETAILS'
  let RETURN_URL = 'http://www.example.com/service'

  function connectorExpects (data) {
    return mockServer.post(connectorChargePath + chargeId + '/cards', data)
  }

  function minimumConnectorCardData (cardNumber) {
    return {
      'card_number': cardNumber,
      'cvc': '234',
      'expiry_date': '11/99',
      'card_brand': 'visa',
      'cardholder_name': 'Jimi Hendrix',
      'address': {
        'line1': '32 Whip Ma Whop Ma Avenue',
        'postcode': 'Y1 1YN',
        'country': 'GB',
        'city': 'Willy wonka'
      }
    }
  }

  function fullConnectorCardData (cardNumber) {
    let cardData = minimumConnectorCardData(cardNumber)
    cardData.address.line2 = 'bla bla'
    cardData.address.city = 'London'
    cardData.address.country = 'GB'
    return cardData
  }

  function fullFormCardData (cardNumber) {
    let cardData = minimumFormCardData(cardNumber)
    cardData.addressLine2 = 'bla bla'
    return cardData
  }

  function minimumFormCardData (cardNumber) {
    return {
      'returnUrl': RETURN_URL,
      'cardUrl': connectorAuthUrl,
      'chargeId': chargeId,
      'cardNo': cardNumber,
      'cvc': '234',
      'expiryMonth': '11',
      'expiryYear': '99',
      'cardholderName': 'Jimi Hendrix',
      'addressLine1': '32 Whip Ma Whop Ma Avenue',
      'addressPostcode': 'Y1 1YN',
      'addressCity': 'Willy wonka',
      'email': 'willy@wonka.com',
      'addressCountry': 'GB'
    }
  }

  function missingFormCardData () {
    return {
      'chargeId': chargeId,
      'returnUrl': RETURN_URL
    }
  }

  beforeEach(function () {
    nock.cleanAll()
    mockServer = nock(localServer)
  })

  describe('The /charge endpoint', function () {
    describe('Different statuses', function () {
      function get (status) {
        nock(process.env.CONNECTOR_HOST, defaultCorrelationHeader)
          .get('/v1/frontend/charges/23144323')
          .reply(200, {
            'amount': 2345,
            'description': 'Payment Description',
            'status': status,
            'return_url': 'http://www.example.com/service',
            'gateway_account': {
              'gateway_account_id': gatewayAccountId,
              'analytics_id': 'test-1234',
              'type': 'test',
              'payment_provider': 'sandbox',
              'service_name': 'Pranks incorporated',
              'card_types': [{
                'type': 'CREDIT',
                'brand': 'VISA',
                'label': 'Visa'
              }]
            }
          })

        nock(process.env.CONNECTOR_HOST, defaultCorrelationHeader)
          .put('/v1/frontend/charges/23144323/status')
          .reply(204)

        defaultAdminusersResponseForGetService(gatewayAccountId)

        let cookieValue = cookie.create(chargeId)
        return getChargeRequest(app, cookieValue, chargeId)
      }

      function getAndCheckChargeRequest (status, done) {
        get(status)
          .expect(200)
          .expect(function (res) {
            helper.templateValueNotUndefined(res, 'csrf')
            helper.templateValue(res, 'amount', '23.45')
            helper.templateValue(res, 'id', chargeId)
            helper.templateValue(res, 'description', 'Payment Description')
            helper.templateValue(res, 'gatewayAccount.paymentProvider', 'sandbox')
            helper.templateValue(res, 'gatewayAccount.analyticsId', 'test-1234')
            helper.templateValue(res, 'gatewayAccount.type', 'test')
            helper.templateValue(res, 'post_card_action', frontendCardDetailsPostPath)
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
            helper.templateValue(res, 'message', 'There is a problem, please try again later')
          }).end(done)
      })

      it('should show appropriate error page when the charge is in a state we deal with', function (done) {
        get('authorisation success')
          .expect(200)
          .expect(function (res) {
            helper.templateValue(res, 'viewName', 'AUTHORISATION_SUCCESS')
          }).end(done)
      })

      it('should show auth failure page when the authorisation has been rejected', function (done) {
        get('authorisation rejected')
          .expect(200)
          .expect(function (res) {
            helper.templateValue(res, 'viewName', 'AUTHORISATION_REJECTED')
          }).end(done)
      })

      it('should show auth failure page when the authorisation has been cancelled', function (done) {
        get('authorisation cancelled')
          .expect(200)
          .expect(function (res) {
            helper.templateValue(res, 'viewName', 'AUTHORISATION_CANCELLED')
          }).end(done)
      })
    })

    // TODO - need to split these tests in to smaller files
    describe('Some random grouping -- Needs refactoring :( ', function () {
      it('should redirect user to auth_waiting when connector returns 202', function (done) {
        var cookieValue = cookie.create(chargeId)
        nock(process.env.CONNECTOR_HOST)
          .patch('/v1/frontend/charges/23144323')
          .reply(200)
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)

        defaultCardID('4242424242424242')

        connectorExpects(minimumConnectorCardData('4242424242424242'))
          .reply(202)

        postChargeRequest(app, cookieValue, minimumFormCardData('4242 4242 4242 4242'), chargeId)
          .expect(303)
          .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/auth_waiting')
          .end(done)
      })

      it('should redirect user to auth_waiting when connector returns 409', function (done) {
        let cookieValue = cookie.create(chargeId)
        nock(process.env.CONNECTOR_HOST)
          .patch('/v1/frontend/charges/23144323')
          .reply(200)
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS)
        defaultAdminusersResponseForGetService(gatewayAccountId)

        nock(adminUsersHost, defaultCorrelationHeader)
          .get(`${servicesResource}?gatewayAccountId=${gatewayAccountId}`)
          .reply(serviceFixtures.validServiceResponse({gateway_account_ids: [gatewayAccountId]}).getPlain())

        defaultCardID('4242424242424242')

        connectorExpects(minimumConnectorCardData('4242424242424242'))
          .reply(409)

        postChargeRequest(app, cookieValue, minimumFormCardData('4242 4242 4242 4242'), chargeId)
          .expect(303)
          .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/auth_waiting')
          .end(done)
      })

      it('should redirect user to confirm when connector returns 200 for authorisation success', function (done) {
        let cookieValue = cookie.create(chargeId)
        nock(process.env.CONNECTOR_HOST)
          .patch('/v1/frontend/charges/23144323')
          .reply(200)
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)
        defaultCardID('4242424242424242')

        connectorExpects(minimumConnectorCardData('4242424242424242'))
          .reply(200, {status: State.AUTH_SUCCESS})

        postChargeRequest(app, cookieValue, minimumFormCardData('4242 4242 4242 4242'), chargeId)
          .expect(303)
          .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .end(done)
      })

      it('should redirect user to confirm when connector returns 200 for authorisation and 3DS is required', function (done) {
        let cookieValue = cookie.create(chargeId)
        nock(process.env.CONNECTOR_HOST)
          .patch('/v1/frontend/charges/23144323')
          .reply(200)
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)
        defaultCardID('4242424242424242')

        connectorExpects(minimumConnectorCardData('4242424242424242'))
          .reply(200, {status: State.AUTH_3DS_REQUIRED})

        postChargeRequest(app, cookieValue, minimumFormCardData('4242 4242 4242 4242'), chargeId)
          .expect(303)
          .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/3ds_required')
          .end(done)
      })

      it('should redirect user from /auth_waiting to /confirm when connector returns a successful status', function (done) {
        let cookieValue = cookie.create(chargeId)
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

      it('should redirect user from /auth_waiting to /3ds_required when connector returns that 3DS is required for authorisation', function (done) {
        var cookieValue = cookie.create(chargeId)
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
        var cookieValue = cookie.create(chargeId)
        defaultConnectorResponseForGetCharge(chargeId, State.AUTH_READY, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)

        request(app)
          .get(frontendCardDetailsPath + '/' + chargeId + '/auth_waiting')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .set('Cookie', ['frontend_state=' + cookieValue])
          .set('Accept', 'application/json')
          .expect(200)
          .expect(function (res) {
            helper.templateValue(res, 'viewName', 'auth_waiting')
          })
          .end(done)
      })

      it('should give an error page if user is in entering card details state', function (done) {
        var cookieValue = cookie.create(chargeId)
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)

        request(app)
          .get(frontendCardDetailsPath + '/' + chargeId + '/auth_waiting')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .set('Cookie', ['frontend_state=' + cookieValue])
          .set('Accept', 'application/json')
          .expect(500)
          .end(done)
      })

      it('should error without csrf', function (done) {
        let cookieValue = cookie.create(chargeId)
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)

        connectorExpects(minimumConnectorCardData('5105105105105100'))
          .reply(204)
        postChargeRequest(app, cookieValue, minimumFormCardData('5105 1051 0510 5100'), chargeId, false)
          .expect(500)
          .end(done)
      })

      it('should send card data including optional fields to connector', function (done) {
        let cookieValue = cookie.create(chargeId)
        defaultCardID('4242424242424242')
        nock(process.env.CONNECTOR_HOST)
          .patch('/v1/frontend/charges/23144323')
          .reply(200)
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)

        var cardData = fullConnectorCardData('5105105105105100')

        connectorExpects(cardData).reply(200)

        var formData = minimumFormCardData('5105105105105100')
        formData.addressLine2 = cardData.address.line2
        formData.addressCity = cardData.address.city

        postChargeRequest(app, cookieValue, formData, chargeId)
          .expect(303)
          .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .end(done)
      })

      it('show an error page when authorization was refused', function (done) {
        let cookieValue = cookie.create(chargeId)
        nock(process.env.CONNECTOR_HOST)
          .patch('/v1/frontend/charges/23144323')
          .reply(200)
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)

        defaultCardID('4242424242424242')

        connectorExpects(minimumConnectorCardData('5105105105105100'))
          .reply(400, {'message': 'This transaction was declined.'})

        postChargeRequest(app, cookieValue, minimumFormCardData('5105105105105100'), chargeId)
          .expect(303)
          .expect(function (res) {
            should.equal(res.headers.location, '/card_details/' + chargeId)
          })
          .end(done)
      })

      it('show an error page when the chargeId is not found on the session', function (done) {
        var cookieValue = cookie.create()

        var cardData = minimumConnectorCardData('5105105105105100')
        cardData.address.line2 = 'bla bla'
        cardData.address.city = 'London'
        cardData.address.country = 'GB'

        connectorExpects(cardData).reply(200)

        var formData = minimumFormCardData('5105105105105100')
        formData.addressLine2 = cardData.address.line2
        formData.addressCity = cardData.address.city

        postChargeRequest(app, cookieValue, formData, chargeId)
          .expect(403)
          .expect(function (res) {
            helper.templateValue(res, 'viewName', 'UNAUTHORISED')
          })
          .end(done)
      })

      it('shows an error when a card is submitted that does not pass the luhn algorithm', function (done) {
        let cookieValue = cookie.create(chargeId)
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)
        defaultCardID('1111111111111111')
        postChargeRequest(app, cookieValue, minimumFormCardData('1111111111111111'), chargeId)
          .expect(200)
          .expect(function (res) {
            helper.templateValue(res, 'id', chargeId)
            helper.templateValue(res, 'post_card_action', frontendCardDetailsPostPath)
            helper.templateValue(res, 'hasError', true)
            helper.templateValue(res, 'amount', '23.45')
            helper.templateValue(res, 'errorFields', [{
              'cssKey': 'card-no',
              'key': 'cardNo',
              'value': 'Enter a valid card number'
            }])
            helper.templateValue(res, 'highlightErrorFields', {'cardNo': 'Enter a valid card number'})
          })
          .end(done)
      })

      it('should return country list when invalid fields submitted', (done) => {
        let cookieValue = cookie.create(chargeId, {})
        defaultCardID('4242424242424242')
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)
        postChargeRequest(app, cookieValue, missingFormCardData(), chargeId)
          .expect((res) => {
            let body = JSON.parse(res.text)
            expect(body.countries.length > 0).to.equal(true)
          })
          .end(done)
      })

      it('shows an error when a card is submitted with missing fields', function (done) {
        let cookieValue = cookie.create(chargeId, {})
        defaultCardID('4242424242424242')
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)
        postChargeRequest(app, cookieValue, missingFormCardData(), chargeId)
          .expect(200)
          .expect(function (res) {
            helper.templateValue(res, 'id', chargeId)
            helper.templateValue(res, 'description', 'Payment Description')
            helper.templateValue(res, 'post_card_action', frontendCardDetailsPostPath)
            helper.templateValue(res, 'hasError', true)
            helper.templateValue(res, 'amount', '23.45')
            helper.templateValue(res, 'withdrawalText', 'Accepted credit and debit card types')
            helper.templateValue(res, 'post_cancel_action', '/card_details/23144323/cancel')
            helper.templateValue(res, 'errorFields', [
              {'key': 'cardNo', 'cssKey': 'card-no', 'value': 'Enter a valid card number'},
              {'key': 'expiryMonth', 'cssKey': 'expiry-date', 'value': 'Enter a valid expiry date'},
              {'key': 'cardholderName', 'cssKey': 'cardholder-name', 'value': 'Enter a valid name'},
              {'key': 'cvc', 'cssKey': 'cvc', 'value': 'Enter a valid card security code'},
              {
                'key': 'addressLine1',
                'cssKey': 'address-line-1',
                'value': 'Enter a valid building name/number and street'
              },
              {'key': 'addressCity', 'cssKey': 'address-city', 'value': 'Enter a valid town/city'},
              {'key': 'addressPostcode', 'cssKey': 'address-postcode', 'value': 'Enter a valid postcode'},
              {'key': 'email', 'cssKey': 'email', 'value': 'Enter a valid email'},
              {'key': 'addressCountry', 'cssKey': 'address-country', 'value': 'Enter a valid country or territory'}
            ])

            helper.templateValue(res, 'highlightErrorFields', {
              'cardholderName': 'Enter the name as it appears on the card',
              'cvc': 'Enter a valid card security code',
              'email': 'Enter a valid email',
              'expiryMonth': 'Enter a valid expiry date',
              'expiryYear': 'Enter a valid expiry date',
              'cardNo': 'Enter a valid card number',
              'addressCity': 'Enter a valid town/city',
              'addressLine1': 'Enter a valid billing address',
              'addressPostcode': 'Enter a valid postcode',
              'addressCountry': 'Enter a valid country or territory'
            })
          })
          .end(done)
      })

      it('shows an error when a card is submitted that is not supported', function (done) {
        let cookieValue = cookie.create(chargeId, {})
        nock.cleanAll()
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)
        nock(process.env.CARDID_HOST)
          .post('/v1/api/card', () => {
            return true
          })
          .reply(200, {brand: 'foobar', label: 'foobar', type: 'D'})
        postChargeRequest(app, cookieValue, minimumFormCardData('3528000700000000'), chargeId)
          .expect(200)
          .expect(function (res) {
            helper.templateValue(res, 'id', chargeId)
            helper.templateValue(res, 'description', 'Payment Description')
            helper.templateValue(res, 'post_card_action', frontendCardDetailsPostPath)
            helper.templateValue(res, 'hasError', true)
            helper.templateValue(res, 'amount', '23.45')
            helper.templateValue(res, 'errorFields', [
              {'key': 'cardNo', 'cssKey': 'card-no', 'value': 'Foobar is not supported'}
            ])
            helper.templateValue(res, 'highlightErrorFields', {
              'cardNo': 'Foobar is not supported'
            })
          })
          .end(done)
      })

      it('shows an error when a card is submitted that is not supported withdrawal type', function (done) {
        let cookieValue = cookie.create(chargeId, {})
        nock.cleanAll()
        nock(process.env.CARDID_HOST)
          .post('/v1/api/card', () => {
            return true
          })
          .reply(200, {brand: 'american-express', label: 'american express', type: 'D'})
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)

        postChargeRequest(app, cookieValue, minimumFormCardData('3528000700000000'), chargeId)
          .expect(200)
          .expect(function (res) {
            helper.templateValue(res, 'id', chargeId)
            helper.templateValue(res, 'description', 'Payment Description')
            helper.templateValue(res, 'post_card_action', frontendCardDetailsPostPath)
            helper.templateValue(res, 'hasError', true)
            helper.templateValue(res, 'amount', '23.45')
            helper.templateValue(res, 'errorFields', [
              {'key': 'cardNo', 'cssKey': 'card-no', 'value': 'American Express debit cards are not supported'}
            ])
            helper.templateValue(res, 'highlightErrorFields', {
              'cardNo': 'American Express debit cards are not supported'
            })
          })
          .end(done)
      })

      it('preserve cardholder name, address lines when a card is submitted with validation errors', function (done) {
        let cookieValue = cookie.create(chargeId, {})
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)

        nock(process.env.CARDID_HOST)
          .post('/v1/api/card', () => {
            return true
          })
          .reply(200, {brand: 'visa', label: 'visa', type: 'D'})
        let cardData = fullFormCardData('4242')
        postChargeRequest(app, cookieValue, cardData, chargeId)
          .expect(200)
          .expect(function (res) {
            helper.templateValue(res, 'cardholderName', cardData.cardholderName)
            helper.templateValue(res, 'addressLine1', cardData.addressLine1)
            helper.templateValue(res, 'addressLine2', cardData.addressLine2)
            helper.templateValue(res, 'addressCity', cardData.addressCity)
            helper.templateValue(res, 'addressPostcode', cardData.addressPostcode)
            helper.templateValueUndefined(res, 'cardNo')
            helper.templateValueUndefined(res, 'cvc')
          })
          .end(done)
      })

      it('should ignore empty/null address lines when second address line populated', function (done) {
        let cookieValue = cookie.create(chargeId)
        defaultCardID('5105105105105100')
        let cardData = minimumConnectorCardData('5105105105105100')
        cardData.address.line1 = 'bla bla'
        delete cardData.address.line3

        nock(process.env.CONNECTOR_HOST)
          .patch('/v1/frontend/charges/23144323')
          .reply(200)
        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)

        connectorExpects(cardData).reply(200)
        let formData = minimumFormCardData('5105105105105100')
        formData.addressLine1 = ''
        formData.addressLine2 = cardData.address.line1

        postChargeRequest(app, cookieValue, formData, chargeId)
          .expect(303, EMPTY_BODY)
          .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .end(done)
      })

      it('should ignore empty/null address lines when only second address line populated', function (done) {
        let cookieValue = cookie.create(chargeId)
        defaultCardID('5105105105105100')
        let cardData = minimumConnectorCardData('5105105105105100')
        cardData.address.line1 = 'bla bla'
        delete cardData.address.line2

        defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
        defaultAdminusersResponseForGetService(gatewayAccountId)

        connectorExpects(cardData).reply(200)
        nock(process.env.CONNECTOR_HOST)
          .patch('/v1/frontend/charges/23144323')
          .reply(200)
        let formData = minimumFormCardData('5105105105105100')
        formData.addressLine1 = ''
        formData.addressLine2 = cardData.address.line1

        postChargeRequest(app, cookieValue, formData, chargeId)
          .expect(303, EMPTY_BODY)
          .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .end(done)
      })

      it('show an error page when the chargeId is not found on the session', function (done) {
        let cookieValue = cookie.create()
        defaultCardID('5105105105105100')
        mockServer.post(connectorChargePath + chargeId + '/cards', {
          'card_number': '5105105105105100',
          'cvc': '234',
          'expiry_date': '11/99'
        }).reply(400, {'message': 'This transaction was declined.'})

        request(app)
          .post(frontendCardDetailsPostPath)
          .set('Cookie', ['frontend_state=' + cookieValue])
          .send({
            'chargeId': chargeId,
            'cardNo': '5105 1051 0510 5100',
            'cvc': '234',
            'expiryDate': '11/99'
          })
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .set('Accept', 'application/json')
          .expect(function (res) {
            should.not.exist(res.headers['set-cookie'])
          })
          .expect(403)
          .expect(function (res) {
            helper.templateValue(res, 'viewName', 'UNAUTHORISED')
          })
          .end(done)
      })
    })
  })

  describe('The /card_details/charge_id endpoint', function () {
    it('It should show card details page if charge status is in "ENTERING CARD DETAILS" state', function (done) {
      let cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .put('/v1/frontend/charges/' + chargeId + '/status').reply(200)
        .get('/v1/frontend/charges/' + chargeId).reply(200, helper.rawSuccessfulGetCharge(enteringCardDetailsState, 'http://www.example.com/service', gatewayAccountId))
      defaultAdminusersResponseForGetService(gatewayAccountId)

      getChargeRequest(app, cookieValue, chargeId)
        .expect(200)
        .expect(function (res) {
          helper.templateValue(res, 'id', chargeId)
          helper.templateValueNotUndefined(res, 'csrf')
          helper.templateValue(res, 'id', chargeId)
          helper.templateValue(res, 'amount', '23.45')
          helper.templateValue(res, 'description', 'Payment Description')
          helper.templateValue(res, 'post_card_action', frontendCardDetailsPostPath)
          helper.templateValue(res, 'withdrawalText', 'Accepted credit and debit card types')
        })
        .end(done)
    })

    it('It should show card details page with correct text for credit card only', function (done) {
      let cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .put('/v1/frontend/charges/' + chargeId + '/status').reply(200)
        .get('/v1/frontend/charges/' + chargeId).reply(200, helper.rawSuccessfulGetChargeDebitCardOnly(enteringCardDetailsState, 'http://www.example.com/service', gatewayAccountId))
      defaultAdminusersResponseForGetService(gatewayAccountId)

      getChargeRequest(app, cookieValue, chargeId, '?debitOnly=true')
        .expect(200)
        .expect(function (res) {
          helper.templateValue(res, 'withdrawalText', 'Credit card payments are not accepted. Please use a debit card.')
        })
        .end(done)
    })

    it('It should not show amex if it is excluded', function (done) {
      let cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .put('/v1/frontend/charges/' + chargeId + '/status').reply(200)
        .get('/v1/frontend/charges/' + chargeId).reply(200, helper.rawSuccessfulGetChargeDebitCardOnly(enteringCardDetailsState, 'http://www.example.com/service', gatewayAccountId))
      defaultAdminusersResponseForGetService(gatewayAccountId)

      getChargeRequest(app, cookieValue, chargeId, '?removeAmex=true')
        .expect(200)
        .expect(function (res) {
          expect(res.text).to.not.contain('american-express')
        })
        .end(done)
    })

    it('It should show 404 page not found if charge status cant be updated to "ENTERING CARD DETAILS" state with a 400 connector response', function (done) {
      let cookieValue = cookie.create(chargeId)
      connectorResponseForPutCharge(chargeId, 400, {'message': 'some error'})

      getChargeRequest(app, cookieValue, chargeId)
        .expect(500)
        .expect(function (res) {
          helper.templateValue(res, 'viewName', 'SYSTEM_ERROR')
        })
        .end(done)
    })

    it('should fail to authorise when email patch fails', function (done) {
      let cookieValue = cookie.create(chargeId)
      nock.cleanAll()

      nock(process.env.CARDID_HOST)
        .post('/v1/api/card', () => {
          return true
        })
        .reply(200, {brand: 'visa', label: 'visa', type: 'D'})

      nock(process.env.CONNECTOR_HOST)
        .patch('/v1/frontend/charges/23144323')
        .reply(500)
      defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      connectorExpects(minimumConnectorCardData('5105105105105100'))
        .reply(200)

      postChargeRequest(app, cookieValue, minimumFormCardData('5105 1051 0510 5100'), chargeId, false)
        .expect(500)
        .end(done)
    })

    it('It should show 500 when email patch fails', function (done) {
      let cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .patch('/v1/frontend/charges/23144323')
        .reply(500)

      getChargeRequest(app, cookieValue, chargeId)
        .expect(500)
        .end(done)
    })
  })

  describe('The /card_details/charge_id/confirm endpoint', function () {
    beforeEach(function () {
      nock.cleanAll()
    })

    it('should return the data needed for the UI', function (done) {
      nock(process.env.CONNECTOR_HOST)
        .get('/v1/frontend/charges/' + chargeId).reply(200, helper.rawSuccessfulGetCharge('AUTHORISATION SUCCESS', 'http://www.example.com/service', gatewayAccountId))
      defaultAdminusersResponseForGetService(gatewayAccountId)
      let cookieValue = cookie.create(chargeId)

      getChargeRequest(app, cookieValue, chargeId, '/confirm')
        .expect(200)
        .expect(function (res) {
          helper.templateValueNotUndefined(res, 'csrf')
          helper.templateValue(res, 'charge.cardDetails.cardNumber', '************1234')
          helper.templateValue(res, 'charge.cardDetails.cardBrand', 'Visa')
          helper.templateValue(res, 'charge.cardDetails.expiryDate', '11/99')
          helper.templateValue(res, 'charge.cardDetails.cardholderName', 'Test User')
          helper.templateValue(res, 'charge.cardDetails.billingAddress', 'line1, line2, city, postcode, United Kingdom')
          helper.templateValue(res, 'charge.gatewayAccount.serviceName', 'Pranks incorporated')
          helper.templateValue(res, 'charge.amount', '23.45')
          helper.templateValue(res, 'charge.description', 'Payment Description')
        })
        .end(done)
    })

    it('should post to the connector capture url looked up from the connector when a post arrives', function (done) {
      nock(process.env.CONNECTOR_HOST)
        .get('/v1/frontend/charges/' + chargeId).reply(200, helper.rawSuccessfulGetCharge(State.AUTH_SUCCESS, 'http://www.example.com/service', gatewayAccountId))
        .post('/v1/frontend/charges/' + chargeId + '/capture').reply(204)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      request(app)
        .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .send({csrfToken: helper.csrfToken()})
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .set('Accept', 'application/json')
        .expect(303, {})
        .expect('Location', '/return/' + chargeId)
        .end(done)
    })

    it('should error if no csrf token', function (done) {
      nock(process.env.CONNECTOR_HOST)
        .get('/v1/frontend/charges/' + chargeId).reply(200, helper.rawSuccessfulGetCharge(State.AUTH_SUCCESS, 'http://www.example.com/service', gatewayAccountId))
        .post('/v1/frontend/charges/' + chargeId + '/capture').reply(200)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      request(app)
        .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .set('Accept', 'application/json')
        .expect(500)
        .end(done)
    })

    it('connector failure when trying to capture should result in error page', function (done) {
      nock(process.env.CONNECTOR_HOST)
        .get('/v1/frontend/charges/' + chargeId).reply(200, helper.rawSuccessfulGetCharge(State.AUTH_SUCCESS, 'http://www.example.com/service', gatewayAccountId))
        .post('/v1/frontend/charges/' + chargeId + '/capture').reply(500)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      request(app)
        .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .set('Cookie', ['frontend_state=' + cookie.createWithReturnUrl(chargeId, undefined, 'http://www.example.com/service')])
        .send({csrfToken: helper.csrfToken()})
        .expect(500)
        .expect(function (res) {
          helper.templateValue(res, 'viewName', 'SYSTEM_ERROR')
          helper.templateValue(res, 'returnUrl', '/return/' + chargeId)
        })
        .end(done)
    })

    it('connector could not authorise capture results in error page', function (done) {
      nock(process.env.CONNECTOR_HOST)
        .get('/v1/frontend/charges/' + chargeId).reply(200, helper.rawSuccessfulGetCharge(State.AUTH_SUCCESS, 'http://www.example.com/service', gatewayAccountId))
        .post('/v1/frontend/charges/' + chargeId + '/capture').reply(400)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      request(app)
        .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .set('Cookie', ['frontend_state=' + cookie.createWithReturnUrl(chargeId, undefined, 'http://www.example.com/service')])
        .send({csrfToken: helper.csrfToken()})
        .expect(function (res) {
          helper.templateValue(res, 'viewName', 'CAPTURE_FAILURE')
        })
        .end(done)
    })

    it('should produce an error if the connector responds with a non 200', function (done) {
      mockServer.get(connectorChargePath + chargeId).reply(404)

      request(app)
        .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .send({csrfToken: helper.csrfToken()})
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .set('Accept', 'application/json')
        .expect(500)
        .expect(function (res) {
          helper.templateValue(res, 'viewName', 'SYSTEM_ERROR')
        })
        .end(done)
    })

    it('should produce an error if the connector returns a non-200 status', function (done) {
      defaultConnectorResponseForGetCharge(chargeId, State.AUTH_SUCCESS, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)
      mockServer.post(connectorChargePath + chargeId + '/capture').reply(1234)

      request(app)
        .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .send({csrfToken: helper.csrfToken()})
        .expect(500)
        .expect(function (res) {
          helper.templateValue(res, 'viewName', 'SYSTEM_ERROR')
        })
        .end(done)
    })

    it('should produce an error if the connector is unreachable for the confirm', function (done) {
      defaultConnectorResponseForGetCharge(chargeId, State.AUTH_SUCCESS, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      request(app)
        .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .send({csrfToken: helper.csrfToken()})
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .expect(500)
        .expect(function (res) {
          helper.templateValue(res, 'viewName', 'SYSTEM_ERROR')
        })
        .end(done)
    })
  })

  describe('capture waiting endpoint', function () {
    it('should keep user in /capture_waiting when connector returns a capture ready state', function (done) {
      let cookieValue = cookie.create(chargeId)
      defaultConnectorResponseForGetCharge(chargeId, State.CAPTURE_READY, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      request(app)
        .get(frontendCardDetailsPath + '/' + chargeId + '/capture_waiting')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Cookie', ['frontend_state=' + cookieValue])
        .set('Accept', 'application/json')
        .expect(200)
        .expect(function (res) {
          helper.templateValue(res, 'viewName', 'capture_waiting')
        })
        .end(done)
    })

    it('should take user to capture submitted view when charge in CAPTURE_SUBMITTED state', function (done) {
      let cookieValue = cookie.create(chargeId)
      defaultConnectorResponseForGetCharge(chargeId, State.CAPTURE_SUBMITTED, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      request(app)
        .get(frontendCardDetailsPath + '/' + chargeId + '/capture_waiting')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Cookie', ['frontend_state=' + cookieValue])
        .set('Accept', 'application/json')
        .expect(200)
        .expect(function (res) {
          helper.templateValue(res, 'viewName', 'CAPTURE_SUBMITTED')
        })
        .end(done)
    })
  })

  describe('The cancel endpoint', function () {
    it('should take user to cancel page on successful cancel when carge in entering card details state', function (done) {
      let cancelEndpoint = frontendCardDetailsPath + '/' + chargeId + '/cancel'
      defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      nock(process.env.CONNECTOR_HOST)
        .post('/v1/frontend/charges/' + chargeId + '/cancel').reply(204)

      request(app)
        .post(cancelEndpoint)
        .send({csrfToken: helper.csrfToken()})
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .expect(200)
        .expect(function (res) {
          helper.templateValue(res, 'viewName', 'USER_CANCELLED')
        })
        .end(done)
    })

    it('should take user to cancel page on successful cancel when charge in authorisation successful state', function (done) {
      let cancelEndpoint = frontendCardDetailsPath + '/' + chargeId + '/cancel'
      defaultConnectorResponseForGetCharge(chargeId, State.AUTH_SUCCESS, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      nock(process.env.CONNECTOR_HOST)
        .post('/v1/frontend/charges/' + chargeId + '/cancel').reply(204)

      request(app)
        .post(cancelEndpoint)
        .send({csrfToken: helper.csrfToken()})
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .expect(200)
        .expect(function (res) {
          helper.templateValue(res, 'viewName', 'USER_CANCELLED')
        })
        .end(done)
    })

    it('should take user to error page on failed cancel', function (done) {
      let cancelEndpoint = frontendCardDetailsPath + '/' + chargeId + '/cancel'
      defaultConnectorResponseForGetCharge(chargeId, State.AUTH_SUCCESS, gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      nock(process.env.CONNECTOR_HOST)
        .post('/v1/frontend/charges/' + chargeId + '/cancel').reply(400)

      request(app)
        .post(cancelEndpoint)
        .send({csrfToken: helper.csrfToken()})
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .expect(500)
        .expect(function (res) {
          helper.templateValue(res, 'viewName', 'SYSTEM_ERROR')
        })
        .end(done)
    })
  })

  describe('The /card_details/charge_id/3ds_required', function () {
    beforeEach(function () {
      nock.cleanAll()
    })

    it('should return the data needed for the iframe UI', function (done) {
      let chargeResponse = helper.rawSuccessfulGetCharge(State.AUTH_3DS_REQUIRED, 'http://www.example.com/service', gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      nock(process.env.CONNECTOR_HOST)
        .get('/v1/frontend/charges/' + chargeId).reply(200, chargeResponse)
      let cookieValue = cookie.create(chargeId)

      getChargeRequest(app, cookieValue, chargeId, '/3ds_required_out')
        .expect(200)
        .expect(function (res) {
          let body = JSON.parse(res.text)
          expect(body.paRequest).to.equal('aPaRequest')
          expect(body.issuerUrl).to.equal('http://issuerUrl.com')
        })
        .end(done)
    })
  })

  describe('The /card_details/charge_id/3ds_required_in', function () {
    beforeEach(function () {
      nock.cleanAll()
    })

    it('should return the data needed for the UI', function (done) {
      let chargeResponse = helper.rawSuccessfulGetCharge(State.AUTH_3DS_REQUIRED, 'http://www.example.com/service', gatewayAccountId)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      nock(process.env.CONNECTOR_HOST)
        .get('/v1/frontend/charges/' + chargeId).reply(200, chargeResponse)
      let cookieValue = cookie.create(chargeId)
      let data = {
        PaRes: 'aPaRes'
      }
      postChargeRequest(app, cookieValue, data, chargeId, false, '/3ds_required_in')
        .expect(200)
        .expect(function (res) {
          let body = JSON.parse(res.text)
          expect(body.paResponse).to.equal('aPaRes')
          expect(body.threeDsHandlerUrl).to.equal(`/card_details/${chargeId}/3ds_handler`)
        })
        .end(done)
    })
  })

  describe('The /card_details/charge_id/3ds_handler', function () {
    beforeEach(function () {
      nock.cleanAll()
    })
    let chargeResponse = _.extend(
      helper.rawSuccessfulGetCharge(State.AUTH_3DS_REQUIRED, 'http://www.example.com/service', gatewayAccountId))

    it('should send 3ds data to connector and redirect to confirm', function (done) {
      let cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .get(`/v1/frontend/charges/${chargeId}`).reply(200, chargeResponse)
        .post(`${connectorChargePath}${chargeId}/3ds`, {pa_response: 'aPaResponse'}).reply(200)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      postChargeRequest(app, cookieValue, {PaRes: 'aPaResponse'}, chargeId, true, '/3ds_handler')
        .expect(303)
        .expect('Location', `${frontendCardDetailsPath}/${chargeId}/confirm`)
        .end(done)
    })

    it('should send 3ds data to connector and redirect to auth_waiting if connector returns a 202', function (done) {
      let cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .get(`/v1/frontend/charges/${chargeId}`).reply(200, chargeResponse)
        .post(`${connectorChargePath}${chargeId}/3ds`, {pa_response: 'aPaResponse'}).reply(202)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      postChargeRequest(app, cookieValue, {PaRes: 'aPaResponse'}, chargeId, true, '/3ds_handler')
        .expect(303)
        .expect('Location', `${frontendCardDetailsPath}/${chargeId}/auth_waiting`)
        .end(done)
    })

    it('should send 3ds data to connector and redirect to auth_waiting if connector returns a 409', function (done) {
      let cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .get(`/v1/frontend/charges/${chargeId}`).reply(200, chargeResponse)
        .post(`${connectorChargePath}${chargeId}/3ds`, {pa_response: 'aPaResponse'}).reply(409)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      postChargeRequest(app, cookieValue, {PaRes: 'aPaResponse'}, chargeId, true, '/3ds_handler')
        .expect(303)
        .expect('Location', `${frontendCardDetailsPath}/${chargeId}/auth_waiting`)
        .end(done)
    })

    it('should send 3ds data to connector and render an error if connector returns an 500', function (done) {
      let cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .get(`/v1/frontend/charges/${chargeId}`).reply(200, chargeResponse)
        .post(`${connectorChargePath}${chargeId}/3ds`, {pa_response: 'aPaResponse'}).reply(500)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      postChargeRequest(app, cookieValue, {PaRes: 'aPaResponse'}, chargeId, true, '/3ds_handler')
        .expect(500)
        .expect(function (res) {
          helper.templateValue(res, 'viewName', 'SYSTEM_ERROR')
        }).end(done)
    })

    it('should send 3ds data to connector and render an error if connector returns an invalid status code', function (done) {
      let cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .get(`/v1/frontend/charges/${chargeId}`).reply(200, chargeResponse)
        .post(`${connectorChargePath}${chargeId}/3ds`, {pa_response: 'aPaResponse'}).reply(404)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      postChargeRequest(app, cookieValue, {PaRes: 'aPaResponse'}, chargeId, true, '/3ds_handler')
        .expect(500)
        .expect(function (res) {
          helper.templateValue(res, 'viewName', 'ERROR')
        }).end(done)
    })

    it('should send 3ds data to connector and render an error if connector post failed', function (done) {
      let cookieValue = cookie.create(chargeId)
      nock(process.env.CONNECTOR_HOST)
        .get(`/v1/frontend/charges/${chargeId}`).reply(200, chargeResponse)
        .post(`${connectorChargePath}${chargeId}/3ds`, {pa_response: 'aPaResponse'}).replyWithError(404)
      defaultAdminusersResponseForGetService(gatewayAccountId)

      postChargeRequest(app, cookieValue, {PaRes: 'aPaResponse'}, chargeId, true, '/3ds_handler')
        .expect(500)
        .expect(function (res) {
          helper.templateValue(res, 'viewName', 'ERROR')
        }).end(done)
    })
  })
})
