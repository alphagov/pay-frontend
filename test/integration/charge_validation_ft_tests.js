const nock = require('nock')
const app = require('../../server.js').getApp
const mockTemplates = require('../test_helpers/mock_templates.js')
app.engine('html', mockTemplates.__express)
const expect = require('chai').expect
const State = require('../../app/models/state.js')
const cookie = require('../test_helpers/session.js')

let {postChargeRequest, defaultConnectorResponseForGetCharge, defaultAdminusersResponseForGetService} = require('../test_helpers/test_helpers.js')

let defaultCardID = function () {
  nock(process.env.CARDID_HOST)
    .post('/v1/api/card', () => {
      return true
    })
    .reply(200, {brand: 'visa', label: 'visa', type: 'D'})
}
let localServer = process.env.CONNECTOR_HOST

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
      'returnUrl': RETURN_URL,
      'cardUrl': connectorAuthUrl,
      'chargeId': chargeId,
      'cardNo': '4242424242424242',
      'cvc': '234',
      'expiryMonth': '11',
      'expiryYear': '99',
      'cardholderName': '012345678901Jimi Hendrix',
      'addressLine1': '012345678901 Whip Ma Whop Ma Avenue',
      'addressLine2': '012345678901line two',
      'addressPostcode': 'Y1 012345678901 1YN',
      'addressCity': 'Willy wonka 012345678901',
      'email': '012345678901willy@wonka.com',
      'addressCountry': 'US'
    }
    const cookieValue = cookie.create(chargeId, {})

    defaultCardID('4242424242424242')
    defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
    defaultAdminusersResponseForGetService(gatewayAccountId)
    postChargeRequest(app, cookieValue, formWithAllFieldsContainingTooManyDigits, chargeId)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err)

        let body = JSON.parse(res.text)

        expect(body.highlightErrorFields.cardholderName).to.equal('Enter the name as it appears on the card')
        expect(body.highlightErrorFields.addressLine1).to.equal('Enter a valid billing address')
        expect(body.highlightErrorFields.addressLine2).to.equal('Enter valid address information')
        expect(body.highlightErrorFields.addressCity).to.equal('Enter a valid town/city')
        expect(body.highlightErrorFields.addressPostcode).to.equal('Enter a valid postcode')
        expect(body.highlightErrorFields.email).to.equal('Enter a valid email')

        done()
      })
  })

  it('shows an error when a card is submitted with a card holder name containing a suspected CVV', function (done) {
    const chargeId = '23144323'
    const formWithAllFieldsContainingTooManyDigits = {
      'returnUrl': RETURN_URL,
      'cardUrl': connectorAuthUrl,
      'chargeId': chargeId,
      'cardNo': '4242424242424242',
      'cvc': '234',
      'expiryMonth': '11',
      'expiryYear': '99',
      'cardholderName': '234',
      'addressLine1': 'Whip Ma Whop Ma Avenue',
      'addressLine2': '1line two',
      'addressPostcode': 'Y1 1YN',
      'addressCity': 'Willy Wonka',
      'email': 'willy@wonka.com',
      'addressCountry': 'US'
    }
    const cookieValue = cookie.create(chargeId, {})

    defaultCardID('4242424242424242')
    defaultConnectorResponseForGetCharge(chargeId, State.ENTERING_CARD_DETAILS, gatewayAccountId)
    defaultAdminusersResponseForGetService(gatewayAccountId)

    postChargeRequest(app, cookieValue, formWithAllFieldsContainingTooManyDigits, chargeId)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err)

        let body = JSON.parse(res.text)

        expect(body.highlightErrorFields.cardholderName).to.equal('Enter the name as it appears on the card')
        expect(body.errorFields.length).to.equal(1)
        expect(body.errorFields[0].value).to.equal('Enter the name as it appears on the card')
        done()
      })
  })
})
