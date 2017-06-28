var EMPTY_BODY = '';

var _ = require('lodash');
var nock = require('nock');
var app = require('../../server.js').getApp;
var mock_templates = require('../test_helpers/mock_templates.js');
app.engine('html', mock_templates.__express);
var csrf = require('csrf');
var {expect} = require('chai');
var State = require('../../app/models/state.js');

var cookie = require('../test_helpers/session.js');

var winston = require('winston');

var {post_charge_request, default_connector_response_for_get_charge} = require('../test_helpers/test_helpers.js');

var defaultCardID = function () {
  nock(process.env.CARDID_HOST)
    .post("/v1/api/card", ()=> {
      return true;
    })
    .reply(200, {brand: "visa", label: "visa", type: "D"});

};
var localServer = process.env.CONNECTOR_HOST;

var connectorChargePath = '/v1/frontend/charges/';
var chargeId = '23144323';
var frontendCardDetailsPath = '/card_details';
var frontendCardDetailsPostPath = '/card_details/' + chargeId;
var RETURN_URL = 'http://www.example.com/service';

var connectorAuthUrl = localServer + connectorChargePath + chargeId + '/cards';
describe('checks for PAN-like numbers', () => {
  beforeEach(function () {
    nock.cleanAll();
  });

  it('shows an error when a card is submitted with missing fields', function (done) {
    const chargeId = '23144323';
    const formWithAllFieldsContainingTooManyDigits = {
      'returnUrl': RETURN_URL,
      'cardUrl': connectorAuthUrl,
      'chargeId': chargeId,
      'cardNo': '4242424242424242',
      'cvc': '234',
      'expiryMonth': '11',
      'expiryYear': '99',
      'cardholderName': '1234567890Jimi Hendrix',
      'addressLine1': '1234567890 Whip Ma Whop Ma Avenue',
      'addressLine2': '1234567890 line two',
      'addressPostcode': 'Y1 1234567890 1YN',
      'addressCity': 'Willy wonka 1234567890',
      'email': '1234567890willy@wonka.com',
      'addressCountry': 'US'
    };
    const cookieValue = cookie.create(chargeId, {});

    defaultCardID('4242424242424242');
    default_connector_response_for_get_charge(chargeId, State.ENTERING_CARD_DETAILS);

    post_charge_request(app, cookieValue, formWithAllFieldsContainingTooManyDigits, chargeId)
      .expect(200)
      .end((err,res) => {
        if (err) return done(err);

        var body = JSON.parse(res.text);

        expect(body.highlightErrorFields.cardholderName).to.equal('Enter the name as it appears on the card');
        expect(body.highlightErrorFields.addressLine1).to.equal('Enter a valid billing address');
        expect(body.highlightErrorFields.addressLine2).to.equal('Enter valid address information');
        expect(body.highlightErrorFields.addressCity).to.equal('Enter a valid town/city');
        expect(body.highlightErrorFields.addressPostcode).to.equal('Enter a valid postcode');
        expect(body.highlightErrorFields.email).to.equal('Enter a valid email');

        done();
      });
  });
});
