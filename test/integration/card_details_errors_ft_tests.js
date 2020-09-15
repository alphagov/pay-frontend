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

  const connectorChargePath = '/v1/frontend/charges/'
  const chargeId = '23144323'
  const frontendCardDetailsPostPath = '/card_details/' + chargeId
  const gatewayAccountId = gatewayAccount.gatewayAccountId

  const connectorAuthUrl = localServer + connectorChargePath + chargeId + '/cards'
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

  describe('Enter card details page — errors ', function () {
    it('should error without frontend state cookie', function (done) {
      postChargeRequest(app, null, minimumFormCardData('5105 1051 0510 5100'), chargeId, false)
        .expect(403)
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
