process.env.SESSION_ENCRYPTION_KEY = 'naskjwefvwei72rjkwfmjwfi72rfkjwefmjwefiuwefjkbwfiu24fmjbwfk';

var request = require('supertest');
var portfinder = require('portfinder');
var app = require(__dirname + '/../server.js').getApp;
var should = require('chai').should();
var helper = require(__dirname + '/test_helpers/test_helpers.js');
var nock = require('nock');



var cookie = require(__dirname + '/test_helpers/session.js');

var get_charge_request = require(__dirname + '/test_helpers/test_helpers.js').get_charge_request;
var default_connector_response_for_get_charge = require(__dirname + '/test_helpers/test_helpers.js').default_connector_response_for_get_charge;
var connector_response_for_put_charge = require(__dirname + '/test_helpers/test_helpers.js').connector_response_for_put_charge;

portfinder.getPort(function (err, connectorPort) {
  var chargeId = '23144323';
  var frontendCardDetailsPath = '/card_details';

  describe('The /confirm endpoint', function () {
    var confirm_not_allowed_statuses = [
      'AUTHORISATION SUBMITTED',
      'CREATED',
      'AUTHORISATION REJECTED',
      'READY_FOR_CAPTURE',
      'AUTHORISATION SUBMITTED',
      'SYSTEM ERROR',
      'SYSTEM CANCELLED',
      'CAPTURED'
    ];
    beforeEach(function() {
      nock.cleanAll();
      process.env.CONNECTOR_HOST = "http://aserver:9000";
    });

    afterEach(function() {
      nock.cleanAll();
      process.env.CONNECTOR_HOST = undefined;
    });




    confirm_not_allowed_statuses.forEach(function (status) {
      var fullSessionData = {
        'amount': 1000,
        'paymentDescription': 'Test Description',
        'cardNumber': "************5100",
        'expiryDate': "11/99",
        'cardholderName': 'T Eulenspiegel',
        'address': 'Kneitlingen, Brunswick, Germany',
        'serviceName': 'Pranks incorporated'
      };

      it('should error when the payment status is ' + status, function (done) {
        nock(process.env.CONNECTOR_HOST)
        .get('/v1/frontend/charges/' + chargeId).reply(200,helper.raw_successful_get_charge(
          status,"http://www.example.com/service"
        ));

        request(app)
          .get(frontendCardDetailsPath + '/' + chargeId + '/confirm')
          .set('Cookie', ['frontend_state=' + cookie.create(chargeId, fullSessionData)])
          .expect(function(res){
            helper.expectTemplateTohave(res,"message",'Page cannot be found');
          })
          .end(done);
      });
    });
  });
});
