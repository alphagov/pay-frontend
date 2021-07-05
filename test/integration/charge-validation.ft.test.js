const nock = require('nock')
const proxyquire = require('proxyquire')
const expect = require('chai').expect
const cheerio = require('cheerio')
const State = require('../../config/state.js')
const cookie = require('../test-helpers/session.js')

const app = proxyquire('../../server.js',
  {
    'memory-cache': {
      get: function () {
        return false
      },
      '@global': true
    }
  }).getApp()

const { postChargeRequest, defaultConnectorResponseForGetCharge, defaultAdminusersResponseForGetService } = require('../test-helpers/test-helpers.js')

const defaultCardID = function () {
  nock(process.env.CARDID_HOST)
    .post('/v1/api/card', () => {
      return true
    })
    .reply(200, { brand: 'visa', label: 'visa', type: 'D' })
}
const mockSuccessPatchEmail = function (chargeId) {
  nock(process.env.CONNECTOR_HOST)
    .patch(`/v1/frontend/charges/${chargeId}`, () => {
      return true
    })
    .reply(200)
}
const localServer = process.env.CONNECTOR_HOST

const connectorChargePath = '/v1/frontend/charges/'
const chargeId = '23144323'
const gatewayAccountId = '12345'
const RETURN_URL = 'http://www.example.com/service'

const connectorAuthUrl = localServer + connectorChargePath + chargeId + '/cards'
describe('checks for PAN-like numbers', () => {
  beforeEach(function () {
    nock.cleanAll()
  })

  it('shows an error when a card is submitted with non-PAN fields containing a suspected PAN', function (done) {
    const chargeId = '23144323'
    const formWithAllFieldsContainingTooManyDigits = {
      returnUrl: RETURN_URL,
      cardUrl: connectorAuthUrl,
      chargeId: chargeId,
      cardNo: '4242424242424242',
      cvc: '234',
      expiryMonth: '11',
      expiryYear: '99',
      cardholderName: '012345678901Jimi Hendrix',
      addressLine1: '012345678901 Whip Ma Whop Ma Avenue',
      addressLine2: '012345678901line two',
      addressPostcode: 'Y1 012345678901 1YN',
      addressCity: 'Willy wonka 012345678901',
      email: '012345678901willy@wonka.com',
      addressCountry: 'US'
    }
    const cookieValue = cookie.create(chargeId, {})

    mockSuccessPatchEmail(chargeId)
    defaultCardID('4242424242424242')
    defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
    defaultAdminusersResponseForGetService(gatewayAccountId)
    postChargeRequest(app, cookieValue, formWithAllFieldsContainingTooManyDigits, chargeId)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err)
        const $ = cheerio.load(res.text)
        const errorMessages = {
          cardholder: 'Enter the name as it appears on the card',
          addressLine1: 'Enter a valid billing address',
          city: 'Enter a valid town/city',
          postcode: 'Enter a valid postcode'
        }
        expect($('#cardholder-name-error').text()).to.contains(errorMessages.cardholder)
        expect($('#error-cardholder-name').text()).to.contains(errorMessages.cardholder)
        expect($('#address-line-1-error').text()).to.contains(errorMessages.addressLine1)
        expect($('#error-address-line-1').text()).to.contains(errorMessages.addressLine1)
        expect($('#address-line-2-error').text()).to.contains('Enter valid address information')
        expect($('#address-city-error').text()).to.contains(errorMessages.city)
        expect($('#error-address-city').text()).to.contains(errorMessages.city)
        expect($('#address-postcode-error').text()).to.contains(errorMessages.postcode)
        expect($('#error-address-postcode').text()).to.contains(errorMessages.postcode)

        done()
      })
  })

  it('shows an error when a card is submitted with a card holder name containing a suspected CVV', function (done) {
    const chargeId = '23144323'
    const formWithAllFieldsContainingTooManyDigits = {
      returnUrl: RETURN_URL,
      cardUrl: connectorAuthUrl,
      chargeId: chargeId,
      cardNo: '4242424242424242',
      cvc: '234',
      expiryMonth: '11',
      expiryYear: '99',
      cardholderName: '234',
      addressLine1: 'Whip Ma Whop Ma Avenue',
      addressLine2: '1line two',
      addressPostcode: 'Y1 1YN',
      addressCity: 'Willy Wonka',
      email: 'willy@wonka.com',
      addressCountry: 'US'
    }
    const cookieValue = cookie.create(chargeId, {})

    mockSuccessPatchEmail(chargeId)
    defaultCardID('4242424242424242')
    defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
    defaultAdminusersResponseForGetService(gatewayAccountId)

    postChargeRequest(app, cookieValue, formWithAllFieldsContainingTooManyDigits, chargeId)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err)
        const $ = cheerio.load(res.text)
        const cardholderErrorText = 'Enter the name as it appears on the card'
        expect($('#cardholder-name-error').text()).to.contains(cardholderErrorText)
        expect($('#error-cardholder-name').text()).to.contains(cardholderErrorText)
        done()
      })
  })

  it('shows an error when an email contains what could be a typo', function (done) {
    const chargeId = '23144323'
    const formWithAllFieldsContainingTooManyDigits = {
      returnUrl: RETURN_URL,
      cardUrl: connectorAuthUrl,
      chargeId: chargeId,
      cardNo: '4242424242424242',
      cvc: '234',
      expiryMonth: '11',
      expiryYear: '99',
      cardholderName: 'A Name',
      addressLine1: 'Whip Ma Whop Ma Avenue',
      addressLine2: '1line two',
      addressPostcode: 'Y1 1YN',
      addressCity: 'Townfordshire',
      email: 'willy@wonka.con',
      addressCountry: 'US'
    }
    const cookieValue = cookie.create(chargeId, {})

    mockSuccessPatchEmail(chargeId)
    defaultCardID('4242424242424242')
    defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
    defaultAdminusersResponseForGetService(gatewayAccountId)

    postChargeRequest(app, cookieValue, formWithAllFieldsContainingTooManyDigits, chargeId)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err)
        const $ = cheerio.load(res.text)
        const typoErrorText = 'There might be a mistake in the last part of your email address. Select your email address.'
        expect($('#email-typo-sugestion-error').text()).to.contains(typoErrorText)
        done()
      })
  })
})
