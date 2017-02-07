var EMPTY_BODY = '';

var _ = require('lodash');
var request = require('supertest');
var nock = require('nock');
var app = require(__dirname + '/../server.js').getApp;
var mock_templates = require(__dirname + '/test_helpers/mock_templates.js');
app.engine('html', mock_templates.__express);
var csrf = require('csrf');
var expect = require('chai').expect;

var should = require('chai').should();

var cookie = require(__dirname + '/test_helpers/session.js');
var helper = require(__dirname + '/test_helpers/test_helpers.js');

var winston = require('winston');

var {get_charge_request, post_charge_request} = require(__dirname + '/test_helpers/test_helpers.js');
var connector_response_for_put_charge = require(__dirname + '/test_helpers/test_helpers.js').connector_response_for_put_charge;
var default_connector_response_for_get_charge = require(__dirname + '/test_helpers/test_helpers.js').default_connector_response_for_get_charge;
var State = require(__dirname + '/../app/models/state.js');

var defaultCardID = function (cardNumber) {
  nock(process.env.CARDID_HOST)
    .post("/v1/api/card", ()=> {
      return true;
    })
    .reply(200, {brand: "visa", label: "visa", type: "D"});

};

var defaultCorrelationHeader = {
  reqheaders: {'x-request-id': 'some-unique-id'}
};

describe('chargeTests', function () {

  var localServer = process.env.CONNECTOR_HOST;

  var connectorChargePath = '/v1/frontend/charges/';
  var chargeId = '23144323';
  var frontendCardDetailsPath = '/card_details';
  var frontendCardDetailsPostPath = '/card_details/' + chargeId;

  var connectorAuthUrl = localServer + connectorChargePath + chargeId + '/cards';
  var connectorMock;
  var enteringCardDetailsState = 'ENTERING CARD DETAILS';
  var RETURN_URL = 'http://www.example.com/service';


  function connector_expects(data) {
    return connectorMock.post(connectorChargePath + chargeId + '/cards', data);
  }

  function minimum_connector_card_data(card_number) {
    return {
      'card_number': card_number,
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
    };
  }

  function full_connector_card_data(card_number) {
    var card_data = minimum_connector_card_data(card_number);
    card_data.address.line2 = 'bla bla';
    card_data.address.city = 'London';
    card_data.address.country = 'GB';
    return card_data;
  }

  function full_form_card_data(card_number) {
    var card_data = minimum_form_card_data(card_number);
    card_data.addressLine2 = 'bla bla';
    return card_data;
  }

  function minimum_form_card_data(card_number) {
    return {
      'returnUrl': RETURN_URL,
      'cardUrl': connectorAuthUrl,
      'chargeId': chargeId,
      'cardNo': card_number,
      'cvc': '234',
      'expiryMonth': '11',
      'expiryYear': '99',
      'cardholderName': 'Jimi Hendrix',
      'addressLine1': '32 Whip Ma Whop Ma Avenue',
      'addressPostcode': 'Y1 1YN',
      'addressCity': 'Willy wonka',
      'email': 'willy@wonka.com',
      'addressCountry': 'GB'
    };
  }

  function missing_form_card_data() {
    return {
      'chargeId': chargeId,
      'returnUrl': RETURN_URL
    };
  }

  beforeEach(function () {
    nock.cleanAll();
    connectorMock = nock(localServer);

  });

  before(function () {
    // Disable logging.
    winston.level = 'none';
  });

  describe('The /charge endpoint', function () {
    describe('Different statuses', function () {
      function get(status) {
        nock(process.env.CONNECTOR_HOST, defaultCorrelationHeader)
          .get("/v1/frontend/charges/23144323")
          .reply(200, {
            'amount': 2345,
            'description': "Payment Description",
            'status': status,
            'return_url': "http://www.example.com/service",
            'gateway_account': {
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
          });
        nock(process.env.CONNECTOR_HOST, defaultCorrelationHeader)
          .put("/v1/frontend/charges/23144323/status")
          .reply(204);

        var cookieValue = cookie.create(chargeId);
        return get_charge_request(app, cookieValue, chargeId);
      }


      function getAndCheckChargeRequest(status, done) {
        get(status)
          .expect(200)
          .expect(function (res) {
            helper.templateValueNotUndefined(res, "csrf");
            helper.templateValue(res, "amount", '23.45');
            helper.templateValue(res, "id", chargeId);
            helper.templateValue(res, "description", "Payment Description");
            helper.templateValue(res, "gatewayAccount.paymentProvider", "sandbox");
            helper.templateValue(res, "gatewayAccount.analyticsId", "test-1234");
            helper.templateValue(res, "gatewayAccount.type", "test");
            helper.templateValue(res, "post_card_action", frontendCardDetailsPostPath);
          })
          .end(done);
      }

      it('should include the data required for the frontend when entering card details', function (done) {
        getAndCheckChargeRequest(enteringCardDetailsState, done);
      });

      it('should include the data required for the frontend when in created state', function (done) {
        getAndCheckChargeRequest("CREATED", done);
      });

      it('should show error page when the charge is not in a state we deal with', function (done) {
        get("invalid")
          .expect(500)
          .expect(function (res) {
            helper.templateValue(res, "message", "There is a problem, please try again later");
          }).end(done);
      });

      it('should show appropriate error page when the charge is in a state we deal with', function (done) {
        get("authorisation success")
          .expect(200)
          .expect(function (res) {
            helper.templateValue(res, "viewName", "AUTHORISATION_SUCCESS");
          }).end(done);
      });

      it('should show auth failure page when the authorisation has been rejected', function (done) {
        get("authorisation rejected")
          .expect(200)
          .expect(function (res) {
            helper.templateValue(res, "viewName", "AUTHORISATION_REJECTED");
          }).end(done);
      });

    });

    it('should redirect user to auth_waiting when connector returns 202', function (done) {
      var cookieValue = cookie.create(chargeId);
      nock(process.env.CONNECTOR_HOST)
        .patch("/v1/frontend/charges/23144323")
        .reply(200);
      default_connector_response_for_get_charge(chargeId, State.ENTERING_CARD_DETAILS);
      defaultCardID('4242424242424242');

      connector_expects(minimum_connector_card_data('4242424242424242'))
        .reply(202);

      post_charge_request(app, cookieValue, minimum_form_card_data('4242 4242 4242 4242'), chargeId)
        .expect(303)
        .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/auth_waiting')
        .end(done);
    });

    it('should redirect user to auth_waiting when connector returns 409', function (done) {
      var cookieValue = cookie.create(chargeId);
      nock(process.env.CONNECTOR_HOST)
        .patch("/v1/frontend/charges/23144323")
        .reply(200);
      default_connector_response_for_get_charge(chargeId, State.ENTERING_CARD_DETAILS);
      defaultCardID('4242424242424242');

      connector_expects(minimum_connector_card_data('4242424242424242'))
        .reply(409);

      post_charge_request(app, cookieValue, minimum_form_card_data('4242 4242 4242 4242'), chargeId)
        .expect(303)
        .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/auth_waiting')
        .end(done);
    });

    it('should redirect user to confirm when connector returns 200 for authorisation success', function (done) {
      var cookieValue = cookie.create(chargeId);
      nock(process.env.CONNECTOR_HOST)
        .patch("/v1/frontend/charges/23144323")
        .reply(200);
      default_connector_response_for_get_charge(chargeId, State.ENTERING_CARD_DETAILS);
      defaultCardID('4242424242424242');

      connector_expects(minimum_connector_card_data('4242424242424242'))
        .reply(200, {status: State.AUTH_SUCCESS});

      post_charge_request(app, cookieValue, minimum_form_card_data('4242 4242 4242 4242'), chargeId)
        .expect(303)
        .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .end(done);
    });

    it('should redirect user to confirm when connector returns 200 for authorisation and 3DS is required', function (done) {
      var cookieValue = cookie.create(chargeId);
      nock(process.env.CONNECTOR_HOST)
        .patch("/v1/frontend/charges/23144323")
        .reply(200);
      default_connector_response_for_get_charge(chargeId, State.ENTERING_CARD_DETAILS);
      defaultCardID('4242424242424242');

      connector_expects(minimum_connector_card_data('4242424242424242'))
        .reply(200, {status: State.AUTH_3DS_REQUIRED});

      post_charge_request(app, cookieValue, minimum_form_card_data('4242 4242 4242 4242'), chargeId)
        .expect(303)
        .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/3ds_required')
        .end(done);
    });

    it('should redirect user from /auth_waiting to /confirm when connector returns a successful status', function (done) {
      var cookieValue = cookie.create(chargeId);

      default_connector_response_for_get_charge(chargeId, State.AUTH_SUCCESS);

      request(app)
        .get(frontendCardDetailsPath + '/' + chargeId + '/auth_waiting')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Cookie', ['frontend_state=' + cookieValue])
        .set('Accept', 'application/json')
        .expect(303)
        .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .end(done);
    });

    it('should redirect user from /auth_waiting to /3ds_required when connector returns that 3DS is required for authorisation', function (done) {
      var cookieValue = cookie.create(chargeId);

      default_connector_response_for_get_charge(chargeId, State.AUTH_3DS_REQUIRED);

      request(app)
        .get(frontendCardDetailsPath + '/' + chargeId + '/auth_waiting')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Cookie', ['frontend_state=' + cookieValue])
        .set('Accept', 'application/json')
        .expect(303)
        .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/3ds_required')
        .end(done);
    });

    it('should keep user in /auth_waiting when connector returns an authorisation ready state', function (done) {
      var cookieValue = cookie.create(chargeId);

      default_connector_response_for_get_charge(chargeId, State.AUTH_READY);

      request(app)
        .get(frontendCardDetailsPath + '/' + chargeId + '/auth_waiting')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Cookie', ['frontend_state=' + cookieValue])
        .set('Accept', 'application/json')
        .expect(200)
        .end(done);
    });

    it('should give an error page if user is in entering card details state', function (done) {
      var cookieValue = cookie.create(chargeId);

      default_connector_response_for_get_charge(chargeId, State.ENTERING_CARD_DETAILS);

      request(app)
        .get(frontendCardDetailsPath + '/' + chargeId + '/auth_waiting')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Cookie', ['frontend_state=' + cookieValue])
        .set('Accept', 'application/json')
        .expect(500)
        .end(done);
    });

    it('should error without csrf', function (done) {
      var cookieValue = cookie.create(chargeId);
      default_connector_response_for_get_charge(chargeId, State.ENTERING_CARD_DETAILS);
      connector_expects(minimum_connector_card_data('5105105105105100'))
        .reply(204);
      post_charge_request(app, cookieValue, minimum_form_card_data('5105 1051 0510 5100'), chargeId)
        .expect(500)
        .end(done);
    });

    it('should send card data including optional fields to connector', function (done) {
      var cookieValue = cookie.create(chargeId);
      defaultCardID('4242424242424242');
      nock(process.env.CONNECTOR_HOST)
        .patch("/v1/frontend/charges/23144323")
        .reply(200);
      default_connector_response_for_get_charge(chargeId, State.ENTERING_CARD_DETAILS);

      var card_data = full_connector_card_data('5105105105105100');

      connector_expects(card_data).reply(200);

      var form_data = minimum_form_card_data('5105105105105100');
      form_data.addressLine2 = card_data.address.line2;
      form_data.addressCity = card_data.address.city;

      post_charge_request(app, cookieValue, form_data, chargeId)
        .expect(303)
        .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .end(done);
    });

    it('show an error page when authorization was refused', function (done) {
      var cookieValue = cookie.create(chargeId);

      nock(process.env.CONNECTOR_HOST)
        .patch("/v1/frontend/charges/23144323")
        .reply(200);

      default_connector_response_for_get_charge(chargeId, State.ENTERING_CARD_DETAILS);
      defaultCardID('4242424242424242');

      connector_expects(minimum_connector_card_data('5105105105105100'))
        .reply(400, {'message': 'This transaction was declined.'});

      post_charge_request(app, cookieValue, minimum_form_card_data('5105105105105100'), chargeId)
        .expect(303)
        .expect(function (res) {
          should.equal(res.headers.location, "/card_details/" + chargeId);
        })
        .end(done);
    });

    it('show an error page when the chargeId is not found on the session', function (done) {
      var cookieValue = cookie.create();

      var card_data = minimum_connector_card_data('5105105105105100');
      card_data.address.line2 = 'bla bla';
      card_data.address.city = 'London';
      card_data.address.country = 'GB';

      connector_expects(card_data).reply(200);

      var form_data = minimum_form_card_data('5105105105105100');
      form_data.addressLine2 = card_data.address.line2;
      form_data.addressCity = card_data.address.city;

      post_charge_request(app, cookieValue, form_data, chargeId)
        .expect(403)
        .expect(function (res) {
          helper.templateValue(res, "viewName", "UNAUTHORISED");
        })
        .end(done);
    });

    it('shows an error when a card is submitted that does not pass the luhn algorithm', function (done) {
      var cookieValue = cookie.create(chargeId);
      default_connector_response_for_get_charge(chargeId, State.ENTERING_CARD_DETAILS);
      defaultCardID('1111111111111111');
      post_charge_request(app, cookieValue, minimum_form_card_data('1111111111111111'), chargeId)
        .expect(200)
        .expect(function (res) {
          helper.templateValue(res, "id", chargeId);
          helper.templateValue(res, "post_card_action", frontendCardDetailsPostPath);
          helper.templateValue(res, "hasError", true);
          helper.templateValue(res, "amount", '23.45');
          helper.templateValue(res, "errorFields", [{
            "cssKey": "card-no",
            "key": "cardNo",
            "value": "Enter a valid card number"
          }]);
          helper.templateValue(res, "highlightErrorFields", {"cardNo": "Please enter a valid card number"});
        })
        .end(done);
    });

    it("should return country list when invalid fields submitted", (done) => {
      var cookieValue = cookie.create(chargeId, {});
      defaultCardID('4242424242424242');
      default_connector_response_for_get_charge(chargeId, State.ENTERING_CARD_DETAILS);
      post_charge_request(app, cookieValue, missing_form_card_data(), chargeId)
        .expect((res) => {
          var body = JSON.parse(res.text);
          expect(body.countries.length > 0).to.equal(true);
        })
        .end(done);
    });

    it('shows an error when a card is submitted with missing fields', function (done) {
      var cookieValue = cookie.create(chargeId, {});
      defaultCardID('4242424242424242');
      default_connector_response_for_get_charge(chargeId, State.ENTERING_CARD_DETAILS);
      post_charge_request(app, cookieValue, missing_form_card_data(), chargeId)
        .expect(200)
        .expect(function (res) {
          helper.templateValue(res, "id", chargeId);
          helper.templateValue(res, "description", "Payment Description");
          helper.templateValue(res, "post_card_action", frontendCardDetailsPostPath);
          helper.templateValue(res, "hasError", true);
          helper.templateValue(res, "amount", "23.45");
          helper.templateValue(res, "withdrawalText", "accepted credit and debit card types");
          helper.templateValue(res, "post_cancel_action", "/card_details/23144323/cancel");
          helper.templateValue(res, "errorFields", [
            {"key": "cardNo", "cssKey": "card-no", "value": "Enter a valid card number"},
            {"key": "expiryMonth", "cssKey": "expiry-date", "value": "Enter a valid expiry date"},
            {"key": "cardholderName", "cssKey": "cardholder-name", "value": "Enter a valid name"},
            {"key": "cvc", "cssKey": "cvc", "value": "Enter a valid card security code"},
            {
              "key": "addressLine1",
              "cssKey": "address-line-1",
              "value": "Enter a valid building name/number and street"
            },
            {"key": "addressCity", "cssKey": "address-city", "value": "Enter a valid town/city"},
            {"key": "addressPostcode", "cssKey": "address-postcode", "value": "Enter a valid postcode"},
            {"key": "email", "cssKey": "email", "value": "Enter a valid email"},
            {"key": "addressCountry", "cssKey": "address-country", "value": "Enter a valid country"}
          ]);

          helper.templateValue(res, "highlightErrorFields", {
            "cardholderName": "Enter the name on the card",
            "cvc": "Enter a card security code",
            "email": "Enter a valid email",
            "expiryMonth": "Enter a valid expiry date",
            "expiryYear": "Enter a valid expiry date",
            "cardNo": "Please enter a valid card number",
            "addressCity": "Enter a Town/City",
            "addressLine1": "Enter a billing address",
            "addressPostcode": "Enter a valid postcode",
            "addressCountry": "Enter a valid country"
          });

        })
        .end(done);
    });


    it('shows an error when a card is submitted that is not supported', function (done) {
      var cookieValue = cookie.create(chargeId, {});
      nock.cleanAll();
      default_connector_response_for_get_charge(chargeId, State.ENTERING_CARD_DETAILS);
      nock(process.env.CARDID_HOST)
        .post("/v1/api/card", ()=> {
          return true;
        })
        .reply(200, {brand: "foobar", label: "foobar", type: "D"});
      post_charge_request(app, cookieValue, minimum_form_card_data('3528000700000000'), chargeId)
        .expect(200)
        .expect(function (res) {

          helper.templateValue(res, "id", chargeId);
          helper.templateValue(res, "description", "Payment Description");
          helper.templateValue(res, "post_card_action", frontendCardDetailsPostPath);
          helper.templateValue(res, "hasError", true);
          helper.templateValue(res, "amount", "23.45");
          helper.templateValue(res, "errorFields", [
            {"key": "cardNo", "cssKey": "card-no", "value": "Foobar is not supported"},
          ]);
          helper.templateValue(res, "highlightErrorFields", {
            "cardNo": "Foobar is not supported",
          });

        })
        .end(done);
    });


    it('shows an error when a card is submitted that is not supported withdrawal type', function (done) {
      var cookieValue = cookie.create(chargeId, {});
      nock.cleanAll();
      nock(process.env.CARDID_HOST)
        .post("/v1/api/card", ()=> {
          return true;
        })
        .reply(200, {brand: "american-express", label: "american express", type: "D"});
      default_connector_response_for_get_charge(chargeId, State.ENTERING_CARD_DETAILS);
      post_charge_request(app, cookieValue, minimum_form_card_data('3528000700000000'), chargeId)
        .expect(200)
        .expect(function (res) {
          helper.templateValue(res, "id", chargeId);
          helper.templateValue(res, "description", "Payment Description");
          helper.templateValue(res, "post_card_action", frontendCardDetailsPostPath);
          helper.templateValue(res, "hasError", true);
          helper.templateValue(res, "amount", "23.45");
          helper.templateValue(res, "errorFields", [
            {"key": "cardNo", "cssKey": "card-no", "value": "American Express debit cards are not supported"},
          ]);
          helper.templateValue(res, "highlightErrorFields", {
            "cardNo": "American Express debit cards are not supported",
          });

        })
        .end(done);
    });

    it('preserve cardholder name, address lines when a card is submitted with validation errors', function (done) {
      var cookieValue = cookie.create(chargeId, {});
      default_connector_response_for_get_charge(chargeId, State.ENTERING_CARD_DETAILS);
      nock(process.env.CARDID_HOST)
        .post("/v1/api/card", ()=> {
          return true;
        })
        .reply(200, {brand: "visa", label: "visa", type: "D"});
      var cardData = full_form_card_data('4242');
      post_charge_request(app, cookieValue, cardData, chargeId)
        .expect(200)
        .expect(function (res) {
          helper.templateValue(res, "cardholderName", cardData.cardholderName);
          helper.templateValue(res, "addressLine1", cardData.addressLine1);
          helper.templateValue(res, "addressLine2", cardData.addressLine2);
          helper.templateValue(res, "addressCity", cardData.addressCity);
          helper.templateValue(res, "addressPostcode", cardData.addressPostcode);
          helper.templateValueUndefined(res, "cardNo");
          helper.templateValueUndefined(res, "cvc");
        })
        .end(done);
    });

    it('should ignore empty/null address lines when second address line populated', function (done) {
      var cookieValue = cookie.create(chargeId);
      defaultCardID('5105105105105100');
      var card_data = minimum_connector_card_data('5105105105105100');
      card_data.address.line1 = 'bla bla';
      delete card_data.address.line3;

      nock(process.env.CONNECTOR_HOST)
        .patch("/v1/frontend/charges/23144323")
        .reply(200);

      default_connector_response_for_get_charge(chargeId, State.ENTERING_CARD_DETAILS);
      connector_expects(card_data).reply(200);
      var form_data = minimum_form_card_data('5105105105105100');
      form_data.addressLine1 = '';
      form_data.addressLine2 = card_data.address.line1;

      post_charge_request(app, cookieValue, form_data, chargeId)
        .expect(303, EMPTY_BODY)
        .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .end(done);
    });

    it('should ignore empty/null address lines when only second address line populated', function (done) {
      var cookieValue = cookie.create(chargeId);
      defaultCardID('5105105105105100');
      var card_data = minimum_connector_card_data('5105105105105100');
      card_data.address.line1 = 'bla bla';
      delete card_data.address.line2;

      default_connector_response_for_get_charge(chargeId, State.ENTERING_CARD_DETAILS);
      connector_expects(card_data).reply(200);
      nock(process.env.CONNECTOR_HOST)
        .patch("/v1/frontend/charges/23144323")
        .reply(200);
      var form_data = minimum_form_card_data('5105105105105100');
      form_data.addressLine1 = '';
      form_data.addressLine2 = card_data.address.line1;

      post_charge_request(app, cookieValue, form_data, chargeId)
        .expect(303, EMPTY_BODY)
        .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .end(done);
    });

    it('show an error page when the chargeId is not found on the session', function (done) {
      var cookieValue = cookie.create();
      defaultCardID('5105105105105100');
      connectorMock.post(connectorChargePath + chargeId + '/cards', {
        'card_number': '5105105105105100',
        'cvc': '234',
        'expiry_date': '11/99'
      }).reply(400, {'message': 'This transaction was declined.'});

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
          should.not.exist(res.headers['set-cookie']);
        })
        .expect(403)
        .expect(function (res) {
          helper.templateValue(res, "viewName", "UNAUTHORISED");
        })
        .end(done);
    });

  });

  describe('The /card_details/charge_id endpoint', function () {

    it('It should show card details page if charge status is in "ENTERING CARD DETAILS" state', function (done) {
      var cookieValue = cookie.create(chargeId);
      nock(process.env.CONNECTOR_HOST)
        .put('/v1/frontend/charges/' + chargeId + '/status').reply(200)
        .get('/v1/frontend/charges/' + chargeId).reply(200, helper.raw_successful_get_charge(enteringCardDetailsState, "http://www.example.com/service"));

      get_charge_request(app, cookieValue, chargeId)
        .expect(200)
        .expect(function (res) {
          helper.templateValue(res, "id", chargeId);
          helper.templateValueNotUndefined(res, "csrf");
          helper.templateValue(res, "id", chargeId);
          helper.templateValue(res, "amount", '23.45');
          helper.templateValue(res, "description", 'Payment Description');
          helper.templateValue(res, "post_card_action", frontendCardDetailsPostPath);
          helper.templateValue(res, "withdrawalText", 'accepted credit and debit card types');
        })
        .end(done);
    });
    it('It should show card details page with correct text for credit card only', function (done) {
      var cookieValue = cookie.create(chargeId);
      nock(process.env.CONNECTOR_HOST)
        .put('/v1/frontend/charges/' + chargeId + '/status').reply(200)
        .get('/v1/frontend/charges/' + chargeId).reply(200, helper.raw_successful_get_charge_debit_card_only(enteringCardDetailsState, "http://www.example.com/service"));

      get_charge_request(app, cookieValue, chargeId, "?debitOnly=true")
        .expect(200)
        .expect(function (res) {
          helper.templateValue(res, "withdrawalText", 'Credit card payments are not accepted. Please use a debit card.');
        })
        .end(done);
    });

    it('It should not show amex if it is excluded', function (done) {
      var cookieValue = cookie.create(chargeId);
      nock(process.env.CONNECTOR_HOST)
        .put('/v1/frontend/charges/' + chargeId + '/status').reply(200)
        .get('/v1/frontend/charges/' + chargeId).reply(200, helper.raw_successful_get_charge_debit_card_only(enteringCardDetailsState, "http://www.example.com/service"));

      get_charge_request(app, cookieValue, chargeId, "?removeAmex=true")
        .expect(200)
        .expect(function (res) {
          expect(res.text).to.not.contain('american-express');
        })
        .end(done);
    });

    it('It should show 404 page not found if charge status cant be updated to "ENTERING CARD DETAILS" state with a 400 connector response', function (done) {
      var cookieValue = cookie.create(chargeId);
      connector_response_for_put_charge(chargeId, 400, {'message': 'some error'});

      get_charge_request(app, cookieValue, chargeId)
        .expect(500)
        .expect(function (res) {
          helper.templateValue(res, "viewName", "SYSTEM_ERROR");
        })
        .end(done);
    });

    it('should fail to authorise when email patch fails', function (done) {
      var cookieValue = cookie.create(chargeId);
      nock.cleanAll();

      nock(process.env.CARDID_HOST)
        .post("/v1/api/card", ()=> {
          return true;
        })
        .reply(200, {brand: "visa", label: "visa", type: "D"});

      nock(process.env.CONNECTOR_HOST)
        .patch("/v1/frontend/charges/23144323")
        .reply(500);
      default_connector_response_for_get_charge(chargeId, State.ENTERING_CARD_DETAILS);

      connector_expects(minimum_connector_card_data('5105105105105100'))
        .reply(200);

      post_charge_request(app, cookieValue, minimum_form_card_data('5105 1051 0510 5100'), chargeId, false)
        .expect(500)
        .end(done);
    });

    it('It should show 500 when email patch fails', function (done) {
      var cookieValue = cookie.create(chargeId);
      nock(process.env.CONNECTOR_HOST)
        .patch("/v1/frontend/charges/23144323")
        .reply(500);

      get_charge_request(app, cookieValue, chargeId)
        .expect(500)
        .end(done);
    });
  });

  describe('The /card_details/charge_id/confirm endpoint', function () {
    beforeEach(function () {
      nock.cleanAll();
    });

    it('should return the data needed for the UI', function (done) {

      nock(process.env.CONNECTOR_HOST)
        .get('/v1/frontend/charges/' + chargeId).reply(200, helper.raw_successful_get_charge("AUTHORISATION SUCCESS", "http://www.example.com/service"));

      var cookieValue = cookie.create(chargeId);

      get_charge_request(app, cookieValue, chargeId, '/confirm')
        .expect(200)
        .expect(function (res) {
          helper.templateValueNotUndefined(res, "csrf");
          helper.templateValue(res, "charge.cardDetails.cardNumber", "************1234");
          helper.templateValue(res, "charge.cardDetails.cardBrand", "Visa");
          helper.templateValue(res, "charge.cardDetails.expiryDate", "11/99");
          helper.templateValue(res, "charge.cardDetails.cardholderName", "Test User");
          helper.templateValue(res, "charge.cardDetails.billingAddress", "line1, line2, city, postcode, United Kingdom");
          helper.templateValue(res, "charge.gatewayAccount.serviceName", "Pranks incorporated");
          helper.templateValue(res, "charge.amount", "23.45");
          helper.templateValue(res, "charge.description", "Payment Description");
        })
        .end(done);
    });

    it('should post to the connector capture url looked up from the connector when a post arrives', function (done) {
      nock(process.env.CONNECTOR_HOST)
        .get('/v1/frontend/charges/' + chargeId).reply(200, helper.raw_successful_get_charge(State.AUTH_SUCCESS, "http://www.example.com/service"))
        .post('/v1/frontend/charges/' + chargeId + "/capture").reply(204);

      request(app)
        .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .send({csrfToken: helper.csrfToken()})
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .set('Accept', 'application/json')
        .expect(303, {})
        .expect('Location', '/return/' + chargeId)
        .end(done);
    });

    it('should error if no csrf token', function (done) {
      nock(process.env.CONNECTOR_HOST)
        .get('/v1/frontend/charges/' + chargeId).reply(200, helper.raw_successful_get_charge(State.AUTH_SUCCESS, "http://www.example.com/service"))
        .post('/v1/frontend/charges/' + chargeId + "/capture").reply(200);

      request(app)
        .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .set('Accept', 'application/json')
        .expect(500)
        .end(done);
    });


    it('connector failure when trying to capture should result in error page', function (done) {
      nock(process.env.CONNECTOR_HOST)
        .get('/v1/frontend/charges/' + chargeId).reply(200, helper.raw_successful_get_charge(State.AUTH_SUCCESS, "http://www.example.com/service"))
        .post('/v1/frontend/charges/' + chargeId + "/capture").reply(500);

      request(app)
        .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .set('Cookie', ['frontend_state=' + cookie.createWithReturnUrl(chargeId, undefined, 'http://www.example.com/service')])
        .send({csrfToken: helper.csrfToken()})
        .expect(500)
        .expect(function (res) {
          helper.templateValue(res, "viewName", "SYSTEM_ERROR");
          helper.templateValue(res, "returnUrl", "/return/" + chargeId);
        })
        .end(done);
    });

    it('connector could not authorise capture results in error page', function (done) {

      nock(process.env.CONNECTOR_HOST)
        .get('/v1/frontend/charges/' + chargeId).reply(200, helper.raw_successful_get_charge(State.AUTH_SUCCESS, "http://www.example.com/service"))
        .post('/v1/frontend/charges/' + chargeId + "/capture").reply(400);

      request(app)
        .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .set('Cookie', ['frontend_state=' + cookie.createWithReturnUrl(chargeId, undefined, 'http://www.example.com/service')])
        .send({csrfToken: helper.csrfToken()})
        .expect(function (res) {
          helper.templateValue(res, "viewName", "CAPTURE_FAILURE");
        })
        .end(done);
    });

    it('should produce an error if the connector responds with a non 200', function (done) {
      connectorMock.get(connectorChargePath + chargeId).reply(404);

      request(app)
        .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .send({csrfToken: helper.csrfToken()})
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .set('Accept', 'application/json')
        .expect(500)
        .expect(function (res) {
          helper.templateValue(res, "viewName", "SYSTEM_ERROR");
        })
        .end(done);
    });


    it('should produce an error if the connector returns a non-200 status', function (done) {
      default_connector_response_for_get_charge(chargeId, State.AUTH_SUCCESS);
      connectorMock.post(connectorChargePath + chargeId + "/capture").reply(1234);
      request(app)
        .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .send({csrfToken: helper.csrfToken()})
        .expect(500)
        .expect(function (res) {
          helper.templateValue(res, "viewName", "SYSTEM_ERROR");
        })
        .end(done);
    });

    it('should produce an error if the connector is unreachable for the confirm', function (done) {
      default_connector_response_for_get_charge(chargeId, State.AUTH_SUCCESS);
      request(app)
        .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .send({csrfToken: helper.csrfToken()})
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .expect(500)
        .expect(function (res) {
          helper.templateValue(res, "viewName", "SYSTEM_ERROR");
        })
        .end(done);
    });
  });

  describe('capture waiting endpoint', function () {
    it('should keep user in /capture_waiting when connector returns a capture ready state', function (done) {
      var cookieValue = cookie.create(chargeId);

      default_connector_response_for_get_charge(chargeId, State.CAPTURE_READY);

      request(app)
        .get(frontendCardDetailsPath + '/' + chargeId + '/capture_waiting')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Cookie', ['frontend_state=' + cookieValue])
        .set('Accept', 'application/json')
        .expect(200)
        .expect(function (res) {
          helper.templateValue(res, "viewName", "success");
        })
        .end(done);
    });

    it('should take user to capture submitted view when charge in CAPTURE_SUBMITTED state', function (done) {
      var cookieValue = cookie.create(chargeId);

      default_connector_response_for_get_charge(chargeId, State.CAPTURE_SUBMITTED);

      request(app)
        .get(frontendCardDetailsPath + '/' + chargeId + '/capture_waiting')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Cookie', ['frontend_state=' + cookieValue])
        .set('Accept', 'application/json')
        .expect(200)
        .expect(function (res) {
          helper.templateValue(res, "viewName", "CAPTURE_SUBMITTED");
        })
        .end(done);
    });
  });

  describe('The cancel endpoint', function () {
    it('should take user to cancel page on successful cancel when carge in entering card details state', function (done) {
      var cancelEndpoint = frontendCardDetailsPath + '/' + chargeId + '/cancel';
      default_connector_response_for_get_charge(chargeId, State.ENTERING_CARD_DETAILS);

      nock(process.env.CONNECTOR_HOST)
        .post('/v1/frontend/charges/' + chargeId + '/cancel').reply(204);

      request(app)
        .post(cancelEndpoint)
        .send({csrfToken: helper.csrfToken()})
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .expect(200)
        .expect(function (res) {
          helper.templateValue(res, "viewName", "USER_CANCELLED");
        })
        .end(done);
    });

    it('should take user to cancel page on successful cancel when charge in authorisation successful state', function (done) {
      var cancelEndpoint = frontendCardDetailsPath + '/' + chargeId + '/cancel';
      default_connector_response_for_get_charge(chargeId, State.AUTH_SUCCESS);

      nock(process.env.CONNECTOR_HOST)
        .post('/v1/frontend/charges/' + chargeId + '/cancel').reply(204);

      request(app)
        .post(cancelEndpoint)
        .send({csrfToken: helper.csrfToken()})
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .expect(200)
        .expect(function (res) {
          helper.templateValue(res, "viewName", "USER_CANCELLED");
        })
        .end(done);
    });

    it('should take user to error page on failed cancel', function (done) {
      var cancelEndpoint = frontendCardDetailsPath + '/' + chargeId + '/cancel';
      default_connector_response_for_get_charge(chargeId, State.AUTH_SUCCESS);

      nock(process.env.CONNECTOR_HOST)
        .post('/v1/frontend/charges/' + chargeId + '/cancel').reply(400);

      request(app)
        .post(cancelEndpoint)
        .send({csrfToken: helper.csrfToken()})
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .expect(500)
        .expect(function (res) {
          helper.templateValue(res, "viewName", "SYSTEM_ERROR");
        })
        .end(done);
    });
  });

  describe('The /card_details/charge_id/3ds_required', function () {
    var FRONTEND_HOST = "https://frontend.pymnt.localdomain";
    var testAuth3ds = {
      auth3dsData: {
        paRequest: "aPaRequest",
        issuerUrl: "https://test.com"
      }
    };

    beforeEach(function () {
      nock.cleanAll();
      process.env.FRONTEND_HOST = FRONTEND_HOST;
    });

    it('should return the data needed for the parent UI', function (done) {
      var chargeResponse = _.extend(
        helper.raw_successful_get_charge("AUTHORISATION 3DS REQUIRED", "http://www.example.com/service"),
        testAuth3ds);

      nock(process.env.CONNECTOR_HOST)
        .get('/v1/frontend/charges/' + chargeId).reply(200, chargeResponse);

      var cookieValue = cookie.create(chargeId);

      get_charge_request(app, cookieValue, chargeId, '/3ds_required')
        .expect(200)
        .expect(function (res) {
          helper.templateValue(res, "viewName", 'AUTHORISATION_3DS_REQUIRED');
        })
        .end(done);
    });

    it('should return the data needed for the iframe UI', function (done) {
      var chargeResponse = _.extend(
        helper.raw_successful_get_charge("AUTHORISATION 3DS REQUIRED", "http://www.example.com/service"),
        testAuth3ds);

      nock(process.env.CONNECTOR_HOST)
        .get('/v1/frontend/charges/' + chargeId).reply(200, chargeResponse);

      var cookieValue = cookie.create(chargeId);

      get_charge_request(app, cookieValue, chargeId, '/3ds_required_out')
        .expect(200)
        .expect(function (res) {
          helper.templateValue(res, "viewName", 'AUTHORISATION_3DS_REQUIRED_OUT');
          helper.templateValue(res, "paRequest", testAuth3ds.auth3dsData.paRequest);
          helper.templateValue(res, "issuerUrl", testAuth3ds.auth3dsData.issuerUrl);
          helper.templateValue(res, "termUrl", `${FRONTEND_HOST}/card_details/${chargeId}/3ds_required_in`);
        })
        .end(done);
    })
  });

  describe('The /card_details/charge_id/3ds_required_in', function () {
    var testAuth3ds = {
      auth3dsData: {
        paRequest: "aPaRequest",
        issuerUrl: "https://test.com"
      }
    };

    beforeEach(function () {
      nock.cleanAll();
    });

    it('should return the data needed for the UI', function (done) {
      var chargeResponse = _.extend(
        helper.raw_successful_get_charge("AUTHORISATION 3DS REQUIRED", "http://www.example.com/service"),
        testAuth3ds);

      nock(process.env.CONNECTOR_HOST)
        .get('/v1/frontend/charges/' + chargeId).reply(200, chargeResponse);

      var cookieValue = cookie.create(chargeId);

      var data = {
        PaRes: 'aPaRes'
      };
      post_charge_request(app, cookieValue, data, chargeId, false, '/3ds_required_in')
        .expect(200)
        .expect(function (res) {
          helper.templateValue(res, "viewName", 'AUTHORISATION_3DS_REQUIRED_IN');
          helper.templateValue(res, "paResponse", "aPaRes");
          helper.templateValue(res, "threeDsHandlerUrl", `/card_details/${chargeId}/3ds_handler`);
        })
        .end(done);
    });
  });
});
