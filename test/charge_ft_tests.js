process.env.SESSION_ENCRYPTION_KEY = 'naskjwefvwei72rjkwfmjwfi72rfkjwefmjwefiuwefjkbwfiu24fmjbwfk';

var EMPTY_BODY='';

var request = require('supertest');
var portfinder = require('portfinder');
var nock = require('nock');
var app = require(__dirname + '/../server.js').getApp;
var should = require('chai').should();

var cookie = require(__dirname + '/utils/session.js');

var winston = require('winston');

var get_charge_request = require(__dirname + '/utils/test_helpers.js').get_charge_request;
var connector_response_for_put_charge = require(__dirname + '/utils/test_helpers.js').connector_response_for_put_charge;
var default_connector_response_for_get_charge = require(__dirname + '/utils/test_helpers.js').default_connector_response_for_get_charge;

portfinder.getPort(function(err, connectorPort) {

  var localServer = 'http://localhost:' + connectorPort;

  var connectorChargePath = '/v1/frontend/charges/';
  var chargeId = '23144323';
  var frontendCardDetailsPath = '/card_details';

  var connectorAuthUrl = localServer + connectorChargePath + chargeId + '/cards';
  var connectorMock = nock(localServer);
  var enteringCardDetailsState = 'ENTERING CARD DETAILS';
  var aHappyState = 'HAPPY-STATE';
  var RETURN_URL = 'http://www.example.com/service';

  function connector_expects(data) {
    return connectorMock.post(connectorChargePath + chargeId + '/cards', data);
  }

  function post_charge_request(cookieValue, data) {
    return request(app)
        .post(frontendCardDetailsPath)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Cookie', ['session_state=' + cookieValue])
        .set('Accept', 'application/json')
        .send(data);
  }

  function minimum_connector_card_data(card_number) {
    return {
      'card_number': card_number,
      'cvc': '234',
      'expiry_date': '11/99',
      'cardholder_name': 'Jimi Hendrix',
      'address': {
        'line1': '32 Whip Ma Whop Ma Avenue',
        'postcode': 'Y1 1YN',
        'country': 'GB'
      }
    };
  }


  function full_connector_card_data(card_number) {
    var card_data = minimum_connector_card_data(card_number);
    card_data.address.line2 = 'bla bla';
    card_data.address.city = 'London';
    card_data.address.county = 'Greater London';
    card_data.address.country = 'GB';
    return card_data;
  }

  function minimum_form_card_data(card_number) {
    return {
      'hiddenAmount': '23.45',
      'returnUrl': RETURN_URL,
      'cardUrl': connectorAuthUrl,
      'chargeId': chargeId,
      'cardNo': card_number,
      'cvc': '234',
      'expiryDate': '11/99',
      'cardholderName': 'Jimi Hendrix',
      'addressLine1': '32 Whip Ma Whop Ma Avenue',
      'addressPostcode': 'Y1 1YN'
    };
  }

  function missing_form_card_data() {
    return {
      'hiddenAmount': '23.45',
      'chargeId': chargeId,
      'returnUrl': RETURN_URL
    };
  }

  beforeEach(function() {
    nock.cleanAll();
  });

  before(function () {
    // Disable logging.
    winston.level = 'none';
  });

  describe('The /charge endpoint', function() {
    it('should include the data required for the frontend', function (done) {

      var cookieValue = cookie.create(chargeId);
      connector_response_for_put_charge(connectorPort, chargeId, 204 , {});
      default_connector_response_for_get_charge(connectorPort, chargeId, enteringCardDetailsState);


      get_charge_request(app, cookieValue, chargeId)
          .expect(function (res) {
            var session = cookie.decrypt(res, chargeId);
            should.equal(session.amount, 2345);
          })
          .expect(200, {
            'amount': '23.45',
            'charge_id': chargeId,
            'return_url': RETURN_URL,
            'paymentDescription': "Payment Description",
            'post_card_action': frontendCardDetailsPath
      }).end(done);
    });

    it('should send clean card data to connector', function(done) {
      var cookieValue = cookie.create(chargeId);

      default_connector_response_for_get_charge(connectorPort, chargeId, aHappyState);

      connector_expects(minimum_connector_card_data('5105105105105100'))
          .reply(204);

      post_charge_request(cookieValue, minimum_form_card_data('5105 1051 0510 5100'))
          .expect(303)
          .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .end(done);
    });

    it('should send card data including optional fields to connector', function (done) {
      var cookieValue = cookie.create(chargeId);

      default_connector_response_for_get_charge(connectorPort, chargeId, aHappyState);

      var card_data = full_connector_card_data('5105105105105100');

      connector_expects(card_data).reply(204);

      var form_data = minimum_form_card_data('5105105105105100');
      form_data.addressLine2 = card_data.address.line2;
      form_data.addressCity = card_data.address.city;
      form_data.addressCounty = card_data.address.county;

      post_charge_request(cookieValue, form_data)
          .expect(303)
          .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .end(done);
    });

    it('should add card data including optional fields to the chargeIds session', function (done) {
      var cookieValue = cookie.create(chargeId);

      default_connector_response_for_get_charge(connectorPort, chargeId, aHappyState);

      connectorMock.post(connectorChargePath + chargeId + '/cards').reply(204);

      var card_data = full_connector_card_data('5105105105105100');
      var form_data = minimum_form_card_data('5105105105105100');

      form_data.addressLine2 = card_data.address.line2;
      form_data.addressCity = card_data.address.city;
      form_data.addressCounty = card_data.address.county;

      var address = '32 Whip Ma Whop Ma Avenue, bla bla, London, Greater London, Y1 1YN';

      post_charge_request(cookieValue, form_data)
          .expect(303, {})
          .expect(function(res) {
                    var session = cookie.decrypt(res, chargeId);
                    should.equal(session.cardNumber, "************5100");
                    should.equal(session.expiryDate, '11/99');
                    should.equal(session.cardholderName, 'Jimi Hendrix');
                    should.equal(session.address, address);
                    should.equal(session.serviceName, "Demo Service");
                  })
          .end(done);
    });

    it('show an error page when authorization was refused', function(done) {
      var cookieValue = cookie.create(chargeId);

      default_connector_response_for_get_charge(connectorPort, chargeId, aHappyState);

      connector_expects(minimum_connector_card_data('5105105105105100'))
          .reply(400, {'message': 'This transaction was declined.'});

      post_charge_request(cookieValue, minimum_form_card_data('5105105105105100'))
          .expect(200, {'message': 'Payment could not be processed, please contact your issuing bank'})
          .end(done);
    });

    it('show an error page when the chargeId is not found on the session', function(done) {
      var cookieValue = cookie.create();

      var card_data = minimum_connector_card_data('5105105105105100');
      card_data.address.line2 = 'bla bla';
      card_data.address.city = 'London';
      card_data.address.county = 'Greater London';
      card_data.address.country = 'GB';

      connector_expects(card_data).reply(204);

      var form_data = minimum_form_card_data('5105105105105100');
      form_data.addressLine2 = card_data.address.line2;
      form_data.addressCity = card_data.address.city;
      form_data.addressCounty = card_data.address.county;

      post_charge_request(cookieValue, form_data)
        .expect(200, {
          'message' : 'There is a problem with the payments platform'
        }, done);
    });

    it('shows an error when a card is submitted that does not pass the luhn algorithm', function (done) {
      var cookieValue = cookie.create(chargeId);

      post_charge_request(cookieValue, minimum_form_card_data('1111111111111111'))
          .expect(200, {
                charge_id: chargeId,
                return_url: RETURN_URL,
                post_card_action: frontendCardDetailsPath,
                hasError: true,
                amount: '23.45',
                errorFields: [{"key": "cardNo", "value": "Card number invalid"}],
                highlightErrorFields: {"cardNo": "invalid"},
                errorMessage: 'The following fields are either missing or have errors in them:'
                })
          .end(done);
    });

    it('shows an error when a card is submitted with missing fields', function (done) {
      var cookieValue = cookie.create(chargeId);

      post_charge_request(cookieValue, missing_form_card_data())
          .expect(200, {
                charge_id: chargeId,
                return_url: RETURN_URL,
                post_card_action: frontendCardDetailsPath,
                hasError: true,
                amount: '23.45',
                errorMessage: 'The following fields are either missing or have errors in them:',
                errorFields: [
                    {"key": "cardNo", "value": "Card number missing"},
                    {"key": "cvc", "value": "CVC missing"},
                    {"key": "expiryDate", "value": "Expiry date missing"},
                    {"key": "cardholderName", "value": "Name on card missing"},
                    {"key": "addressLine1", "value": "Building name/number and street missing"},
                    {"key": "addressPostcode", "value": "Postcode missing"}
                ],
                highlightErrorFields: {
                    "cardNo":"missing",
                    "cvc":"missing",
                    "expiryDate":"missing",
                    "cardholderName":"missing",
                    "addressLine1":"missing",
                    "addressPostcode":"missing"
                    }
          })
          .end(done);
    });

    it('should ignore empty/null address lines when second address line populated', function (done) {
      var cookieValue = cookie.create(chargeId);

      var card_data = minimum_connector_card_data('5105105105105100');
      card_data.address.line1 = 'bla bla';
      delete card_data.address.line3;

      default_connector_response_for_get_charge(connectorPort, chargeId, aHappyState);
      connector_expects(card_data).reply(204);
      var form_data = minimum_form_card_data('5105105105105100');
      form_data.addressLine1 = '';
      form_data.addressLine2 = card_data.address.line1;

      post_charge_request(cookieValue, form_data)
                .expect(303, EMPTY_BODY)
                .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
                .end(done);
    });

    it('should ignore empty/null address lines when only third address line populated', function (done) {
      var cookieValue = cookie.create(chargeId);

      var card_data = minimum_connector_card_data('5105105105105100');
      card_data.address.line1 = 'bla bla';
      delete card_data.address.line2;

      default_connector_response_for_get_charge(connectorPort, chargeId, aHappyState);
      connector_expects(card_data).reply(204);
      var form_data = minimum_form_card_data('5105105105105100');
      form_data.addressLine1 = '';
      form_data.addressLine2 = card_data.address.line1;

      post_charge_request(cookieValue, form_data)
                .expect(303, EMPTY_BODY)
                .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
                .end(done);
    });

    it('show an error page when the chargeId is not found on the session', function(done) {
      var cookieValue = cookie.create();

      connectorMock.post(connectorChargePath + chargeId + '/cards', {
        'card_number' : '5105105105105100',
        'cvc' : '234',
        'expiry_date' : '11/99'
      }).reply(400, { 'message': 'This transaction was declined.' });

      request(app)
        .post(frontendCardDetailsPath)
        .set('Cookie', ['session_state=' + cookieValue])
        .send({
          'chargeId'  : chargeId,
          'cardNo'    : '5105 1051 0510 5100',
          'cvc'       : '234',
          'expiryDate': '11/99'
        })
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Accept', 'application/json')
        .expect(function(res) {
          should.not.exist(res.headers['set-cookie']);
        })
        .expect(200, {
          'message' : 'There is a problem with the payments platform'
        }, done);
    });

  });

  describe('The /card_details/charge_id endpoint', function(){

        it('It should show card details page if charge status is in "ENTERING CARD DETAILS" state', function (done){
            var cookieValue = cookie.create(chargeId);
            default_connector_response_for_get_charge(connectorPort, chargeId, enteringCardDetailsState);
            connector_response_for_put_charge(connectorPort, chargeId, 204 , {});

            get_charge_request(app, cookieValue, chargeId)
                                .expect(200, {'charge_id': chargeId,
                                              'amount': '23.45',
                                              'return_url': 'http://www.example.com/service',
                                              'paymentDescription': "Payment Description",
                                              'post_card_action': '/card_details'
                                              })
                                .end(done);
        });

        it('It should show 404 page not found if charge status cant be updated to "ENTERING CARD DETAILS" state with a 400 connector response', function (done){
            var cookieValue = cookie.create(chargeId);
            connector_response_for_put_charge(connectorPort, chargeId, 400 , {'message':'some error'});

            get_charge_request(app, cookieValue, chargeId)
                                .expect(404, {'message': 'Page cannot be found'})
                                .end(done);
        });

        it('It should show 404 page not found if charge status cant be updated to "ENTERING CARD DETAILS" state with a 500 connector response', function (done){
            var cookieValue = cookie.create(chargeId);
            connector_response_for_put_charge(connectorPort, chargeId, 500 , {});

            get_charge_request(app, cookieValue, chargeId)
                                .expect(404, {'message': 'Page cannot be found'})
                                .end(done);
        });
  });

  describe('The /card_details/charge_id/confirm endpoint', function () {
    var fullSessionData = {
      'amount': 1000,
      'paymentDescription': "Payment description",
      'cardNumber': "************5100",
      'expiryDate': "11/99",
      'cardholderName': 'T Eulenspiegel',
      'address': 'Kneitlingen, Brunswick, Germany',
      'serviceName': 'Pranks incorporated'
    };

    it('should return the data needed for the UI', function (done) {

      default_connector_response_for_get_charge(connectorPort, chargeId, 'AUTHORISATION SUCCESS');

      request(app)
        .get(frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .set('Cookie', ['session_state=' + cookie.create(chargeId, fullSessionData)])
        .set('Accept', 'application/json')
        .expect(200, {
          'cardNumber': "************5100",
          'expiryDate': "11/99",
          'amount': "10.00",
          'paymentDescription': "Payment description",
          'cardholderName': "T Eulenspiegel",
          'address': 'Kneitlingen, Brunswick, Germany',
          'serviceName': 'Pranks incorporated',
          'backUrl': frontendCardDetailsPath + '/' + chargeId,
          'confirmUrl':  frontendCardDetailsPath + '/' + chargeId + '/confirm',
          'charge_id': chargeId
        }, done);
    });

    function missing_field_test(missing_field) {
      return function (done) {

        var sessionData = JSON.parse(JSON.stringify(fullSessionData));
        delete sessionData[missing_field];

        request(app)
            .get(frontendCardDetailsPath + '/' + chargeId + '/confirm')
            .set('Cookie', ['session_state=' + cookie.create(chargeId, sessionData)])
            .set('Accept', 'application/json')
            .expect(200, {
              'message': 'Session expired'
            }, done);
      };
    }

    ['amount', 'expiryDate', 'cardNumber', 'cardholderName', 'address', 'serviceName'].map(function (missing_field) {
      it('should display Session expired message if ' + missing_field + ' is not in the session', missing_field_test(missing_field));
    });

    it('should post to the connector capture url looked up from the connector when a post arrives', function (done) {
      default_connector_response_for_get_charge(connectorPort, chargeId, aHappyState);
      connectorMock.post(connectorChargePath + chargeId + "/capture", {}).reply(204);

      request(app)
          .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .set('Cookie', ['session_state=' + cookie.create(chargeId)])
          .set('Accept', 'application/json')
          .expect(303, {})
          .expect('Location', 'http://www.example.com/service')
          .end(done);
    });

    it('connector failure when trying to capture should result in error page', function (done) {
      default_connector_response_for_get_charge(connectorPort, chargeId, "AUTHORISATION SUCCESS");
      connectorMock.post(connectorChargePath + chargeId + "/capture", {}).reply(500);

      request(app)
          .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .set('Cookie', ['session_state=' + cookie.create(chargeId)])
          .set('Accept', 'application/json')
          .expect(200,
            {
              'message'    : 'There was a problem processing your payment. Please contact the service.',
              'return_url': 'http://www.example.com/service'
            })
          .end(done);
    });

    it('connector failure when trying to authorise payment should result in error page', function (done) {
      var cookieValue = cookie.create(chargeId);
      default_connector_response_for_get_charge(connectorPort, chargeId, aHappyState);
      var card_data = full_connector_card_data('5105105105105100');
      connector_expects(card_data).reply(500);

      var form_data = minimum_form_card_data('5105105105105100');
      form_data.addressLine2 = card_data.address.line2;
      form_data.addressCity = card_data.address.city;
      form_data.addressCounty = card_data.address.county;

      post_charge_request(cookieValue, form_data)
          .expect(200,
            {
              'message'    : 'There was a problem processing your payment. Please contact the service.',
              'return_url': 'http://www.example.com/service'
            })
          .end(done);
    });

    it('should produce an error if the connector responds with a 404 for the charge', function (done) {
      connectorMock.get(connectorChargePath + chargeId).reply(404);

      request(app)
          .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .set('Cookie', ['session_state=' + cookie.create(chargeId)])
          .set('Accept', 'application/json')
          .expect(200, {'message': 'There is a problem with the payments platform'}, done);
    });


    it('should produce an error if the connector returns a non-204 status', function (done) {
      default_connector_response_for_get_charge(connectorPort, chargeId, aHappyState);
      connectorMock.post(connectorChargePath + chargeId + "/capture", {}).reply(1234);

      request(app)
          .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .set('Cookie', ['session_state=' + cookie.create(chargeId)])
          .set('Accept', 'application/json')
          .expect(200, {'message': 'There is a problem with the payments platform'}, done);
    });

    it('should produce an error if the connector is unreachable for the confirm', function (done) {
      default_connector_response_for_get_charge(connectorPort, chargeId, aHappyState);
      request(app)
          .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .set('Cookie', ['session_state=' + cookie.create(chargeId)])
          .set('Accept', 'application/json')
          .expect(200, {'message': 'There is a problem with the payments platform'}, done);
    });
  });
});
