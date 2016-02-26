process.env.SESSION_ENCRYPTION_KEY = 'naskjwefvwei72rjkwfmjwfi72rfkjwefmjwefiuwefjkbwfiu24fmjbwfk';
process.env.DISABLE_INTERNAL_HTTPS = "true"; //for making sure tests use non HTTPS rest client requests

var EMPTY_BODY='';

var request = require('supertest');
var portfinder = require('portfinder');
var nock = require('nock');
var app = require(__dirname + '/../server.js').getApp;
var mock_templates = require(__dirname + '/test_helpers/mock_templates.js');
app.engine('html', mock_templates.__express);
var chai_expect = require('chai').expect;


var should = require('chai').should();

var cookie = require(__dirname + '/test_helpers/session.js');
var helper = require(__dirname + '/test_helpers/test_helpers.js');

var winston = require('winston');

var get_charge_request = require(__dirname + '/test_helpers/test_helpers.js').get_charge_request;
var connector_response_for_put_charge = require(__dirname + '/test_helpers/test_helpers.js').connector_response_for_put_charge;
var default_connector_response_for_get_charge = require(__dirname + '/test_helpers/test_helpers.js').default_connector_response_for_get_charge;

portfinder.getPort(function(err, connectorPort) {
  describe('chargeTests',function(){

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
          'country': 'GB'
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
      process.env.CONNECTOR_HOST = "http://aServer:65535";
    });

    afterEach(function() {
      process.env.CONNECTOR_HOST = undefined;
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
              helper.expectTemplateTohave(res,"amount",'23.45');
              helper.expectTemplateTohave(res,"charge_id",chargeId);
              helper.expectTemplateTohave(res,"return_url",RETURN_URL);
              helper.expectTemplateTohave(res,"paymentDescription","Payment Description");
              helper.expectTemplateTohave(res,"post_card_action",frontendCardDetailsPath);
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
              helper.expectTemplateTohave(res,"message","View INVALID not found");
            }).end(done);
        });

        it('should show appropriate error page when the charge is in a state we deal with', function (done) {
          get("authorisation success")
            .expect(200)
            .expect(function(res){
              helper.expectTemplateTohave(res,"viewName","errors/charge_new_state_auth_success");
            }).end(done);
        });

        it('should show auth failure page when the authorisation has been rejected', function (done) {
          get("authorisation rejected")
            .expect(200)
            .expect(function(res){
              helper.expectTemplateTohave(res,"viewName","errors/charge_new_state_auth_failure");
            }).end(done);
        });

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

        default_connector_response_for_get_charge(connectorPort, chargeId, aHappyState);

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
          .expect(404)
          .expect(function(res){
            helper.expectTemplateTohave(res,"message","Page cannot be found");
          })
          .end(done);
      });

      it('shows an error when a card is submitted that does not pass the luhn algorithm', function (done) {
        var cookieValue = cookie.create(chargeId);

        post_charge_request(cookieValue, minimum_form_card_data('1111111111111111'))
            .expect(200)
            .expect(function(res){
              helper.expectTemplateTohave(res,"charge_id",chargeId);
              helper.expectTemplateTohave(res,"return_url",RETURN_URL);
              helper.expectTemplateTohave(res,"post_card_action",frontendCardDetailsPath);
              helper.expectTemplateTohave(res,"hasError",true);
              helper.expectTemplateTohave(res,"amount",'23.45');
              helper.expectTemplateTohave(res,"errorFields",[{"key": "card-no", "value": "Card number is invalid"}]);
              helper.expectTemplateTohave(res,"highlightErrorFields",{"cardNo": "Please enter the long number on the front of your card"});
            })
            .end(done);
      });

      it('shows an error when a card is submitted with missing fields', function (done) {
        var sessionData = {
                  'paymentDescription': "Payment description"
        };
        var cookieValue = cookie.create(chargeId, sessionData);

        post_charge_request(cookieValue, missing_form_card_data())
            .expect(200)
            .expect(function(res){
              helper.expectTemplateTohave(res,"charge_id",chargeId);
              helper.expectTemplateTohave(res,"paymentDescription",sessionData.paymentDescription);
              helper.expectTemplateTohave(res,"post_card_action",frontendCardDetailsPath);
              helper.expectTemplateTohave(res,"hasError",true);
              helper.expectTemplateTohave(res,"amount","23.45");
              helper.expectTemplateTohave(res,"errorFields", [
                {"key": "cardholder-name", "value": "Name on card is missing"},
                {"key": "card-no", "value": "Card number is missing"},
                {"key": "cvc", "value": "CVC is missing"},
                {"key": "expiry-date", "value": "Expiry date is missing"},
                {"key": "address-line1", "value": "Building name/number and street is missing"},
                {"key": "address-postcode", "value": "Postcode is missing"}
              ]);

              helper.expectTemplateTohave(res,"highlightErrorFields",{
                "cardholderName":"Please enter the name as it appears on the card",
                "cardNo":"Please enter the long number on the front of your card",
                "cvc":"Please enter your card security code",
                "expiryDate":"Please enter a valid expiry date",
                "addressLine1":"Please enter your address",
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
          .expect(404)
          .expect(function(res){
            helper.expectTemplateTohave(res,"message","Page cannot be found");
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
                  helper.expectTemplateTohave(res,"charge_id",chargeId);
                  helper.expectTemplateTohave(res,"amount",'23.45');
                  helper.expectTemplateTohave(res,"return_url",'http://www.example.com/service');
                  helper.expectTemplateTohave(res,"paymentDescription",'Payment Description');
                  helper.expectTemplateTohave(res,"post_card_action",'/card_details');
                })
                .end(done);
          });

          it('It should show 404 page not found if charge status cant be updated to "ENTERING CARD DETAILS" state with a 400 connector response', function (done){
              var cookieValue = cookie.create(chargeId);
              connector_response_for_put_charge(connectorPort, chargeId, 400 , {'message':'some error'});

              get_charge_request(app, cookieValue, chargeId)
                .expect(404)
                .expect(function(res){
                  helper.expectTemplateTohave(res,"message","Page cannot be found");
                })
                .end(done);
          });

          it('It should show 404 page not found if charge status cant be updated to "ENTERING CARD DETAILS" state with a 500 connector response', function (done){
              var cookieValue = cookie.create(chargeId);
              connector_response_for_put_charge(connectorPort, chargeId, 500 , {});

              get_charge_request(app, cookieValue, chargeId)
                .expect(404)
                .expect(function(res){
                  helper.expectTemplateTohave(res,"message","Page cannot be found");
                })
                .end(done);
          });
    });

    describe('The /card_details/charge_id/confirm endpoint', function () {
    beforeEach(function() {
      nock.cleanAll();
      process.env.CONNECTOR_HOST = "http://aServer:65535";
    });

    afterEach(function() {
      process.env.CONNECTOR_HOST = undefined;
    });


      var fullSessionData = {
        'amount': "10.00",
        'paymentDescription': "Payment description",
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
            helper.expectTemplateTohave(res,"session",{
              'cardNumber': "************5100",
              "expiryDate":"11/99",
              "amount":"10.00",
              "paymentDescription":"Payment description",
              "cardholderName":"T Eulenspiegel",
              "address":"Kneitlingen, Brunswick, Germany",
              "serviceName":"Pranks incorporated",
            });
          })
          .end(done);
      });

      function missing_field_test(missing_field) {
        return function (done) {

          var sessionData = JSON.parse(JSON.stringify(fullSessionData));
          delete sessionData[missing_field];

          request(app)
            .get(frontendCardDetailsPath + '/' + chargeId + '/confirm')
            .set('Cookie', ['frontend_state=' + cookie.create(chargeId, sessionData)])
            .expect(200)
            .expect(function(res){
              helper.expectTemplateTohave(res,"message","Session expired");
            })
            .end(done);
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
            .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
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
            .set('Cookie', ['frontend_state=' + cookie.createWithReturnUrl(chargeId, undefined, 'http://www.example.com/service')])
            .expect(200)
            .expect(function(res){
              helper.expectTemplateTohave(res,"message","There was a problem processing your payment. Please contact the service.");
              helper.expectTemplateTohave(res,"return_url","http://www.example.com/service");
            })
            .end(done);
      });

      it('connector failure when trying to authorise payment should result in error page', function (done) {
        var cookieValue = cookie.createWithReturnUrl(chargeId, undefined, 'http://www.example.com/service');
        default_connector_response_for_get_charge(connectorPort, chargeId, aHappyState);
        var card_data = full_connector_card_data('5105105105105100');
        connector_expects(card_data).reply(500);

        var form_data = minimum_form_card_data('5105105105105100');
        form_data.addressLine2 = card_data.address.line2;
        form_data.addressCity = card_data.address.city;

        post_charge_request(cookieValue, form_data)
            .expect(200)
            .expect(function(res){
              helper.expectTemplateTohave(res,"message","There was a problem processing your payment. Please contact the service.");
              helper.expectTemplateTohave(res,"return_url","http://www.example.com/service");
            })
            .end(done);
      });

      it('should produce an error if the connector responds with a 404 for the charge', function (done) {
        connectorMock.get(connectorChargePath + chargeId).reply(404);

        request(app)
            .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
            .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
            .set('Accept', 'application/json')
            .expect(200)
            .expect(function(res){
              helper.expectTemplateTohave(res,"message","There is a problem with the payments platform");
            })
            .end(done);
      });


      it('should produce an error if the connector returns a non-204 status', function (done) {
        default_connector_response_for_get_charge(connectorPort, chargeId, aHappyState);
        connectorMock.post(connectorChargePath + chargeId + "/capture", {}).reply(1234);

        request(app)
            .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
            .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
            .expect(200)
            .expect(function(res){
              helper.expectTemplateTohave(res,"message","There is a problem with the payments platform");
            })
            .end(done);
      });

      it('should produce an error if the connector is unreachable for the confirm', function (done) {
        default_connector_response_for_get_charge(connectorPort, chargeId, aHappyState);
        request(app)
            .post(frontendCardDetailsPath + '/' + chargeId + '/confirm')
            .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
            .expect(200)
            .expect(function(res){
              helper.expectTemplateTohave(res,"message","There is a problem with the payments platform");
            })
            .end(done);
      });
    });
  });
});
