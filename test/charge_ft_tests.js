var EMPTY_BODY='';

var request = require('supertest');
var nock = require('nock');
var app = require(__dirname + '/../server.js').getApp;
var mock_templates = require(__dirname + '/test_helpers/mock_templates.js');
app.engine('html', mock_templates.__express);
var csrf = require('csrf');


var should = require('chai').should();

var cookie = require(__dirname + '/test_helpers/session.js');
var helper = require(__dirname + '/test_helpers/test_helpers.js');

var winston = require('winston');

var get_charge_request = require(__dirname + '/test_helpers/test_helpers.js').get_charge_request;
var connector_response_for_put_charge = require(__dirname + '/test_helpers/test_helpers.js').connector_response_for_put_charge;
var default_connector_response_for_get_charge = require(__dirname + '/test_helpers/test_helpers.js').default_connector_response_for_get_charge;
var ENTERING_CARD_DETAILS_STATUS = 'ENTERING CARD DETAILS';
var AUTH_SUCCESS_STATE = 'AUTHORISATION SUCCESS';

describe('chargeTests',function(){

  var localServer = process.env.CONNECTOR_HOST;

  var connectorChargePath = '/v1/frontend/charges/';
  var chargeId = '23144323';
  var frontendCardDetailsPath = '/card_details';

  var connectorAuthUrl = localServer + connectorChargePath + chargeId + '/cards';
  var connectorMock;
  var enteringCardDetailsState = 'ENTERING CARD DETAILS';
  var RETURN_URL = 'http://www.example.com/service';


  function connector_expects(data) {
    return connectorMock.post(connectorChargePath + chargeId + '/cards', data);
  }

  function post_charge_request(cookieValue, data,sendCSRF) {
    sendCSRF = (sendCSRF === undefined) ? true : sendCSRF;
    if (sendCSRF) {
      data.csrfToken = csrf().create(process.env.CSRF_USER_SECRET);
    }

    return request(app)
        .post(frontendCardDetailsPath)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Cookie', ['frontend_state=' + cookieValue])
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
      'addressCity': 'Willy wonka'
    };
  }

  function missing_form_card_data() {
    return {
      'chargeId': chargeId,
      'returnUrl': RETURN_URL
    };
  }

  beforeEach(function() {
    nock.cleanAll();
    connectorMock = nock(localServer);
  });

  before(function () {
    // Disable logging.
    winston.level = 'none';
  });

  describe('The /charge endpoint', function() {
    describe('Different statuses',function(){
      var get = function(status){
          nock(process.env.CONNECTOR_HOST)
          .get("/v1/frontend/charges/23144323")
          .reply(200, {
              'amount': 2345,
              'description': "Payment Description",
              'status': status,
              'return_url': "http://www.example.com/service"
          });
          nock(process.env.CONNECTOR_HOST)
          .put("/v1/frontend/charges/23144323/status")
          .reply(204);

          var cookieValue = cookie.create(chargeId);
          return get_charge_request(app, cookieValue, chargeId);
      };


      var GetAndCheckChargeRequest = function(status,done){
        get(status)
          .expect(200)
          .expect(function(res){
            helper.templateValueNotUndefined(res,"csrf");
            helper.templateValue(res,"amount",'23.45');
            helper.templateValue(res,"id",chargeId);
            helper.templateValue(res,"return_url",RETURN_URL);
            helper.templateValue(res,"description","Payment Description");
            helper.templateValue(res,"post_card_action",frontendCardDetailsPath);
          })
          .end(done);
      };
      it('should include the data required for the frontend when enetering card details', function (done) {
        GetAndCheckChargeRequest(enteringCardDetailsState,done);
      });

      it('should include the data required for the frontend when in created state', function (done) {
        GetAndCheckChargeRequest("CREATED",done);
      });

      it('should show error page when the charge is not in a state we deal with', function (done) {
        get("invalid")
          .expect(500)
          .expect(function(res){
            helper.templateValue(res,"message","View INVALID not found");
          }).end(done);
      });

      it('should show appropriate error page when the charge is in a state we deal with', function (done) {
        get("authorisation success")
          .expect(200)
          .expect(function(res){
            helper.templateValue(res,"viewName","AUTHORISATION_SUCCESS");
          }).end(done);
      });

      it('should show auth failure page when the authorisation has been rejected', function (done) {
        get("authorisation rejected")
          .expect(200)
          .expect(function(res){
            helper.templateValue(res,"viewName","AUTHORISATION_REJECTED");
          }).end(done);
      });

    });



    it('should send clean card data to connector', function(done) {
      var cookieValue = cookie.create(chargeId);

      default_connector_response_for_get_charge(chargeId, ENTERING_CARD_DETAILS_STATUS);

      connector_expects(minimum_connector_card_data('5105105105105100'))
          .reply(204);

      post_charge_request(cookieValue, minimum_form_card_data('5105 1051 0510 5100'))
          .expect(303)
          .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .end(done);
    });


    it('should error without csrf', function(done) {
      var cookieValue = cookie.create(chargeId);
      default_connector_response_for_get_charge(chargeId, ENTERING_CARD_DETAILS_STATUS);
      connector_expects(minimum_connector_card_data('5105105105105100'))
          .reply(204);
      post_charge_request(cookieValue, minimum_form_card_data('5105 1051 0510 5100'),false)
          .expect(500)
          .end(done);
    });

    it('should send card data including optional fields to connector', function (done) {
      var cookieValue = cookie.create(chargeId);

      default_connector_response_for_get_charge(chargeId, ENTERING_CARD_DETAILS_STATUS);

      var card_data = full_connector_card_data('5105105105105100');

      connector_expects(card_data).reply(204);

      var form_data = minimum_form_card_data('5105105105105100');
      form_data.addressLine2 = card_data.address.line2;
      form_data.addressCity = card_data.address.city;

      post_charge_request(cookieValue, form_data)
          .expect(303)
          .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .end(done);
    });

    it('should add card data including optional fields to the chargeIds session', function (done) {
      var cookieValue = cookie.create(chargeId);

      default_connector_response_for_get_charge(chargeId, ENTERING_CARD_DETAILS_STATUS);

      connectorMock.post(connectorChargePath + chargeId + '/cards').reply(204);

      var card_data = full_connector_card_data('5105105105105100');
      var form_data = minimum_form_card_data('5105105105105100');

      form_data.addressLine2 = card_data.address.line2;
      form_data.addressCity = card_data.address.city;

      var address = '32 Whip Ma Whop Ma Avenue, bla bla, London, Y1 1YN';

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

      default_connector_response_for_get_charge(chargeId, ENTERING_CARD_DETAILS_STATUS);

      connector_expects(minimum_connector_card_data('5105105105105100'))
          .reply(400, {'message': 'This transaction was declined.'});

      post_charge_request(cookieValue, minimum_form_card_data('5105105105105100'))
          .expect(303)
          .expect(function(res){
            should.equal(res.headers.location, "/card_details/" + chargeId);
          })
          .end(done);
    });

    it('show an error page when the chargeId is not found on the session', function(done) {
      var cookieValue = cookie.create();

      var card_data = minimum_connector_card_data('5105105105105100');
      card_data.address.line2 = 'bla bla';
      card_data.address.city = 'London';
      card_data.address.country = 'GB';

      connector_expects(card_data).reply(204);

      var form_data = minimum_form_card_data('5105105105105100');
      form_data.addressLine2 = card_data.address.line2;
      form_data.addressCity = card_data.address.city;

      post_charge_request(cookieValue, form_data)
        .expect(500)
        .expect(function(res){
          helper.templateValue(res,"viewName","SYSTEM_ERROR");
        })
        .end(done);
    });

    it('shows an error when a card is submitted that does not pass the luhn algorithm', function (done) {
      var cookieValue = cookie.create(chargeId);
      default_connector_response_for_get_charge(chargeId, ENTERING_CARD_DETAILS_STATUS);

      post_charge_request(cookieValue, minimum_form_card_data('1111111111111111'))
          .expect(200)
          .expect(function(res){
            helper.templateValue(res,"id",chargeId);
            helper.templateValue(res,"return_url",RETURN_URL);
            helper.templateValue(res,"post_card_action",frontendCardDetailsPath);
            helper.templateValue(res,"hasError",true);
            helper.templateValue(res,"amount",'23.45');
            helper.templateValue(res,"errorFields",[{"cssKey": "card-no","key": "cardNo", "value": "Card number is invalid"}]);
            helper.templateValue(res,"highlightErrorFields",{"cardNo": "Please enter the long number on the front of your card"});
          })
          .end(done);
    });

    it('shows an error when a card is submitted with missing fields', function (done) {
      var cookieValue = cookie.create(chargeId, {});
      default_connector_response_for_get_charge(chargeId, ENTERING_CARD_DETAILS_STATUS);
      post_charge_request(cookieValue, missing_form_card_data())
          .expect(200)
          .expect(function(res){
            helper.templateValue(res,"id",chargeId);
            helper.templateValue(res,"description","Payment Description");
            helper.templateValue(res,"post_card_action",frontendCardDetailsPath);
            helper.templateValue(res,"hasError",true);
            helper.templateValue(res,"amount","23.45");
            helper.templateValue(res,"errorFields", [
              {"key" : "cardholderName", "cssKey": "cardholder-name", "value": "Name on card is missing"},
              {"key" : "cardNo", "cssKey": "card-no", "value": "Card number is missing"},
              {"key" : "cvc", "cssKey": "cvc", "value": "CVC is missing"},
              {"key" : "expiryMonth", "cssKey": "expiry-month", "value": "Expiry month is missing"},
              {"key" : "expiryYear", "cssKey": "expiry-year", "value": "Expiry year is missing"},
              {"key" : "addressLine1", "cssKey": "address-line-1", "value": "Building name/number and street is missing"},
              {"key" : "addressCity", "cssKey": "address-city", "value": "Town/City is missing"},
              {"key" : "addressPostcode", "cssKey": "address-postcode", "value": "Postcode is missing"}
            ]);

            helper.templateValue(res,"highlightErrorFields",{
              "cardholderName":"Please enter the name as it appears on the card",
              "cardNo":"Please enter the long number on the front of your card",
              "cvc":"Please enter your card security code",
              "expiryMonth": "Please enter a valid expiry date",
              "expiryYear": "Please enter a valid expiry date",
              "addressLine1":"Please enter your address",
              "addressCity": "Please enter your Town/City",
              "addressPostcode":"Please enter a valid postcode"
            });

          })
          .end(done);
    });

    it('should ignore empty/null address lines when second address line populated', function (done) {
      var cookieValue = cookie.create(chargeId);

      var card_data = minimum_connector_card_data('5105105105105100');
      card_data.address.line1 = 'bla bla';
      delete card_data.address.line3;

      default_connector_response_for_get_charge(chargeId, ENTERING_CARD_DETAILS_STATUS);
      connector_expects(card_data).reply(204);
      var form_data = minimum_form_card_data('5105105105105100');
      form_data.addressLine1 = '';
      form_data.addressLine2 = card_data.address.line1;

      post_charge_request(cookieValue, form_data)
                .expect(303, EMPTY_BODY)
                .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
                .end(done);
    });

    it('should ignore empty/null address lines when only second address line populated', function (done) {
      var cookieValue = cookie.create(chargeId);

      var card_data = minimum_connector_card_data('5105105105105100');
      card_data.address.line1 = 'bla bla';
      delete card_data.address.line2;

      default_connector_response_for_get_charge(chargeId, ENTERING_CARD_DETAILS_STATUS);
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
        .set('Cookie', ['frontend_state=' + cookieValue])
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
        .expect(500)
        .expect(function(res){
          helper.templateValue(res,"viewName","SYSTEM_ERROR");
        })
        .end(done);
    });

  });

  describe('The /card_details/charge_id endpoint', function(){

        it('It should show card details page if charge status is in "ENTERING CARD DETAILS" state', function (done){
            var cookieValue = cookie.create(chargeId);
            nock(process.env.CONNECTOR_HOST)
              .put('/v1/frontend/charges/' + chargeId + '/status').reply(204)
              .get('/v1/frontend/charges/' + chargeId).reply(200,helper.raw_successful_get_charge(enteringCardDetailsState,"http://www.example.com/service"));

            get_charge_request(app, cookieValue, chargeId)
              .expect(200)
              .expect(function(res){
                helper.templateValue(res,"id",chargeId);
                helper.templateValueNotUndefined(res,"csrf");
                helper.templateValue(res,"id",chargeId);
                helper.templateValue(res,"amount",'23.45');
                helper.templateValue(res,"return_url",'http://www.example.com/service');
                helper.templateValue(res,"description",'Payment Description');
                helper.templateValue(res,"post_card_action",'/card_details');
              })
              .end(done);
        });

        it('It should show 404 page not found if charge status cant be updated to "ENTERING CARD DETAILS" state with a 400 connector response', function (done){
            var cookieValue = cookie.create(chargeId);
            connector_response_for_put_charge(chargeId, 400 , {'message':'some error'});

            get_charge_request(app, cookieValue, chargeId)
              .expect(500)
              .expect(function(res){
                helper.templateValue(res,"viewName","SYSTEM_ERROR");
              })
              .end(done);
        });

        it('It should show 404 page not found if charge status cant be updated to "ENTERING CARD DETAILS" state with a 500 connector response', function (done){
            var cookieValue = cookie.create(chargeId);
            connector_response_for_put_charge(chargeId, 500 , {});

            get_charge_request(app, cookieValue, chargeId)
              .expect(500)
              .expect(function(res){
                helper.templateValue(res,"viewName","SYSTEM_ERROR");
              })
              .end(done);
        });
  });

  describe('The /card_details/charge_id/confirm endpoint', function () {
    beforeEach(function() {
      nock.cleanAll();
    });

    var fullSessionData = {

      'cardNumber': "************5100",
      'expiryDate': "11/99",
      'cardholderName': 'T Eulenspiegel',
      'address': 'Kneitlingen, Brunswick, Germany',
      'serviceName': 'Pranks incorporated'
    };

    it('should return the data needed for the UI', function (done) {

      nock(process.env.CONNECTOR_HOST)
        .get('/v1/frontend/charges/' + chargeId).reply(200,helper.raw_successful_get_charge("AUTHORISATION SUCCESS","http://www.example.com/service"));

      request(app)
        .get(frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId, fullSessionData)])
        .expect(200)
        .expect(function(res){
          helper.templateValueNotUndefined(res,"csrf");
          helper.templateValue(res,"session.cardNumber","************5100");
          helper.templateValue(res,"session.expiryDate","11/99");
          helper.templateValue(res,"session.cardholderName","T Eulenspiegel");
          helper.templateValue(res,"session.address","Kneitlingen, Brunswick, Germany");
          helper.templateValue(res,"session.serviceName","Pranks incorporated");
          helper.templateValue(res,"amount","23.45");
          helper.templateValue(res,"description","Payment Description");
        })
        .end(done);
    });

    function missing_field_test(missing_field) {
      return function (done) {
        default_connector_response_for_get_charge(chargeId, "AUTHORISATION SUCCESS");


        var sessionData = JSON.parse(JSON.stringify(fullSessionData));
        delete sessionData[missing_field];

        request(app)
          .get(frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .set('Cookie', ['frontend_state=' + cookie.create(chargeId, sessionData)])
          .expect(422)
          .expect(function(res){
            helper.templateValue(res,"viewName","SESSION_INCORRECT");
          })
          .end(done);
      };
    }

    [ 'expiryDate', 'cardNumber', 'cardholderName', 'address', 'serviceName'].map(function (missing_field) {
      it('should display Session expired message if ' + missing_field + ' is not in the session', missing_field_test(missing_field));
    });

    it('should post to the connector capture url looked up from the connector when a post arrives', function (done) {
      nock(process.env.CONNECTOR_HOST)
        .get('/v1/frontend/charges/' + chargeId).reply(200,helper.raw_successful_get_charge(AUTH_SUCCESS_STATE,"http://www.example.com/service"))
        .post('/v1/frontend/charges/' + chargeId + "/capture").reply(204);

      request(app)
          .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .send({ csrfToken: helper.csrfToken() })
          .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
          .set('Accept', 'application/json')
          .expect(303, {})
          .expect('Location', 'http://www.example.com/service')
          .end(done);
    });

    it('should error if no csrf token', function (done) {
      nock(process.env.CONNECTOR_HOST)
        .get('/v1/frontend/charges/' + chargeId).reply(200,helper.raw_successful_get_charge(AUTH_SUCCESS_STATE,"http://www.example.com/service"))
        .post('/v1/frontend/charges/' + chargeId + "/capture").reply(204);

      request(app)
          .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
          .set('Accept', 'application/json')
          .expect(500)
          .end(done);
    });


    it('connector failure when trying to capture should result in error page', function (done) {
       nock(process.env.CONNECTOR_HOST)
          .get('/v1/frontend/charges/' + chargeId).reply(200,helper.raw_successful_get_charge(AUTH_SUCCESS_STATE,"http://www.example.com/service"))
          .post('/v1/frontend/charges/' + chargeId + "/capture").reply(500);

      request(app)
          .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .set('Cookie', ['frontend_state=' + cookie.createWithReturnUrl(chargeId, undefined, 'http://www.example.com/service')])
          .send({ csrfToken: helper.csrfToken() })
          .expect(500)
          .expect(function(res){
            helper.templateValue(res,"viewName","SYSTEM_ERROR");
            helper.templateValue(res,"returnUrl","http://www.example.com/service");
          })
          .end(done);
    });

    it('connector could not authorise capture results in error page', function (done) {

       nock(process.env.CONNECTOR_HOST)
          .get('/v1/frontend/charges/' + chargeId).reply(200,helper.raw_successful_get_charge(AUTH_SUCCESS_STATE,"http://www.example.com/service"))
          .post('/v1/frontend/charges/' + chargeId + "/capture").reply(400);

      request(app)
          .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .set('Cookie', ['frontend_state=' + cookie.createWithReturnUrl(chargeId, undefined, 'http://www.example.com/service')])
          .send({ csrfToken: helper.csrfToken() })
          .expect(function(res){
            helper.templateValue(res,"viewName","CAPTURE_FAILURE");
          })
          .end(done);
    });

    it('should produce an error if the connector responds with a non 200', function (done) {
      connectorMock.get(connectorChargePath + chargeId).reply(404);

      request(app)
          .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .send({ csrfToken: helper.csrfToken() })
          .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
          .set('Accept', 'application/json')
          .expect(500)
          .expect(function(res){
            helper.templateValue(res,"viewName","SYSTEM_ERROR");
          })
          .end(done);
    });


    it('should produce an error if the connector returns a non-204 status', function (done) {
      default_connector_response_for_get_charge(chargeId, AUTH_SUCCESS_STATE);
      connectorMock.post(connectorChargePath + chargeId + "/capture").reply(1234);
      request(app)
          .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
          .send({ csrfToken: helper.csrfToken() })
          .expect(500)
          .expect(function(res){
            helper.templateValue(res,"viewName","SYSTEM_ERROR");
          })
          .end(done);
    });

    it('should produce an error if the connector is unreachable for the confirm', function (done) {
      default_connector_response_for_get_charge(chargeId, AUTH_SUCCESS_STATE);
      request(app)
          .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .send({ csrfToken: helper.csrfToken() })
          .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
          .expect(500)
          .expect(function(res){
            helper.templateValue(res,"viewName","SYSTEM_ERROR");
          })
          .end(done);
    });
  });
});
