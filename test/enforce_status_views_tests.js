process.env.SESSION_ENCRYPTION_KEY = 'naskjwefvwei72rjkwfmjwfi72rfkjwefmjwefiuwefjkbwfiu24fmjbwfk';

var request = require('supertest');
var portfinder = require('portfinder');
var app = require(__dirname + '/../server.js').getApp;
var should = require('chai').should();
var helper = require(__dirname + '/utils/test_helpers.js');
var nock = require('nock');



var cookie = require(__dirname + '/utils/session.js');

var get_charge_request = require(__dirname + '/utils/test_helpers.js').get_charge_request;
var default_connector_response_for_get_charge = require(__dirname + '/utils/test_helpers.js').default_connector_response_for_get_charge;
var connector_response_for_put_charge = require(__dirname + '/utils/test_helpers.js').connector_response_for_put_charge;

portfinder.getPort(function (err, connectorPort) {
  var chargeId = '23144323';
  var frontendCardDetailsPath = '/card_details';

  describe('The /card_details endpoint', function () {
    beforeEach(function() {
      nock.cleanAll();
    });
    var card_details_not_allowed_statuses = [
      'AUTHORISATION SUBMITTED',
      'AUTHORISATION REJECTED',
      'AUTHORISATION SUCCESS',
      'READY_FOR_CAPTURE',
      'AUTHORISATION SUBMITTED',
      'SYSTEM ERROR',
      'SYSTEM CANCELLED',
      'CAPTURED'
    ];


    card_details_not_allowed_statuses.forEach(function (status) {
      it('should error when the payment status is ' + status, function (done) {
        var cookieValue = cookie.create(chargeId);
        connector_response_for_put_charge(connectorPort, chargeId, 204 , {});
        default_connector_response_for_get_charge(connectorPort, chargeId, status);

        get_charge_request(app, cookieValue, chargeId)
          .expect(404)
          .expect(function(res){
            helper.expectTemplateTohave(res,"message",'Page cannot be found');
          })
          .end(done);
      });
    });
  });

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
        console.log("running test for ");
        console.log(status);
        default_connector_response_for_get_charge(connectorPort, chargeId, status);
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
