process.env.SESSION_ENCRYPTION_KEY = 'naskjwefvwei72rjkwfmjwfi72rfkjwefmjwefiuwefjkbwfiu24fmjbwfk';

var request = require('supertest');
var portfinder = require('portfinder');
var app = require(__dirname + '/../server.js').getApp;
var should = require('chai').should();
var helper = require(__dirname + '/test_helpers/test_helpers.js');
var nock = require('nock');



var cookie = require(__dirname + '/test_helpers/session.js');

var chargeId = '23144323';
var frontendCardDetailsPath = '/card_details';

describe('The /confirm endpoint undealt with states', function () {
  var confirm_not_allowed_statuses = [
    'AUTHORISATION SUBMITTED',
    'CREATED',
    'AUTHORISATION REJECTED',
    'READY_FOR_CAPTURE',
    'SYSTEM ERROR',
    'SYSTEM CANCELLED',
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
        .expect(500)
        .expect(function(res){
          helper.expectTemplateTohave(res,"message", "View " +  status.toUpperCase().replace(" ", "_") + " not found");
        })
        .end(done);
    });
  });
});


describe('The /confirm endpoint dealt with states', function () {
  var confirm_not_allowed_statuses = [
    {
      name: 'capture submitted',
      view: "errors/charge_confirm_state_completed",
      viewState: 'successful'
    },
    {
      name: 'captured',
      view: "errors/charge_confirm_state_completed",
      viewState: 'successful'
    },
    {
      name: 'capture failure',
      view: "errors/charge_confirm_state_completed",
      viewState: 'unsuccessful'
    }
  ];
  beforeEach(function() {
    nock.cleanAll();
    process.env.CONNECTOR_HOST = "http://aserver:9000";
  });

  afterEach(function() {
    nock.cleanAll();
    process.env.CONNECTOR_HOST = undefined;
  });




  confirm_not_allowed_statuses.forEach(function (state) {
    var fullSessionData = {
      'amount': 1000,
      'paymentDescription': 'Test Description',
      'cardNumber': "************5100",
      'expiryDate': "11/99",
      'cardholderName': 'T Eulenspiegel',
      'address': 'Kneitlingen, Brunswick, Germany',
      'serviceName': 'Pranks incorporated'
    };

    it('should error when the payment status is ' + state.name, function (done) {
      nock(process.env.CONNECTOR_HOST)
      .get('/v1/frontend/charges/' + chargeId).reply(200,helper.raw_successful_get_charge(
        state.name,"http://www.example.com/service"
      ));

      request(app)
        .get(frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId, fullSessionData)])
        .expect(function(res){

          helper.expectTemplateTohave(res,"viewName", state.view);
          helper.expectTemplateTohave(res,"status", state.viewState);

        })
        .end(done);
    });
  });
});


describe('The /charge endpoint undealt with states', function () {
  var confirm_not_allowed_statuses = [
    'READY_FOR_CAPTURE',
    'SYSTEM ERROR',
    'SYSTEM CANCELLED',
    'CAPTURED',
    'CAPTURE FAILURE',
    'CAPTURE SUBMITTED'
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
        .get(frontendCardDetailsPath + '/' + chargeId)
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId, fullSessionData)])
        .expect(500)
        .expect(function(res){
          helper.expectTemplateTohave(res,"message", "View " +  status.toUpperCase().replace(" ", "_") + " not found");
        })
        .end(done);
    });
  });
});


describe('The /charge endpoint dealt with states', function () {
  var confirm_not_allowed_statuses = [
    {
      name: 'authorisation success',
      view: "errors/charge_new_state_auth_success",
      viewState: 'successful'
    },
    {
      name: 'authorisation rejected',
      view: "errors/charge_new_state_auth_failure",
      viewState: 'successful'
    }
  ];
  beforeEach(function() {
    nock.cleanAll();
    process.env.CONNECTOR_HOST = "http://aserver:9000";
  });

  afterEach(function() {
    nock.cleanAll();
    process.env.CONNECTOR_HOST = undefined;
  });




  confirm_not_allowed_statuses.forEach(function (state) {
    var fullSessionData = {
      'amount': 1000,
      'paymentDescription': 'Test Description',
      'cardNumber': "************5100",
      'expiryDate': "11/99",
      'cardholderName': 'T Eulenspiegel',
      'address': 'Kneitlingen, Brunswick, Germany',
      'serviceName': 'Pranks incorporated'
    };

    it('should error when the payment status is ' + state.name, function (done) {
      nock(process.env.CONNECTOR_HOST)
      .get('/v1/frontend/charges/' + chargeId).reply(200,helper.raw_successful_get_charge(
        state.name,"http://www.example.com/service"
      ));

      request(app)
        .get(frontendCardDetailsPath + '/' + chargeId)
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId, fullSessionData)])
        .expect(function(res){
          console.log('this test');
          helper.expectTemplateTohave(res,"viewName", state.view);
          helper.expectTemplateTohave(res,"chargeId", chargeId);

        })
        .end(done);
    });
  });
});
