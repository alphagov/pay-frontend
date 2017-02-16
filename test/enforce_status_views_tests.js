process.env.SESSION_ENCRYPTION_KEY = 'naskjwefvwei72rjkwfmjwfi72rfkjwefmjwefiuwefjkbwfiu24fmjbwfk';

var request = require('supertest');
var portfinder = require('portfinder');
var app = require(__dirname + '/../server.js').getApp;
var should = require('chai').should();
var helper = require(__dirname + '/test_helpers/test_helpers.js');
var nock = require('nock');
var paths = require(__dirname + '/../app/paths.js');




var cookie = require(__dirname + '/test_helpers/session.js');

var chargeId = '23144323';
var frontendCardDetailsPath = '/card_details';

describe('The /charge endpoint undealt statuses', function () {
  var charge_not_allowed_statuses = [
    'READY_FOR_CAPTURE'
  ];

  charge_not_allowed_statuses.forEach(function (status) {
    beforeEach(function(){
      nock.cleanAll();
      nock(process.env.CONNECTOR_HOST)
      .get('/v1/frontend/charges/' + chargeId).reply(200,helper.raw_successful_get_charge(
        status,"http://www.example.com/service"
      ));
    });

    it('should error when the payment status is ' + status, function (done) {
      request(app)
        .get(frontendCardDetailsPath + '/' + chargeId)
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .expect(500)
        .expect(function(res){
          helper.templateValue(res,"message", "There is a problem, please try again later");
        })
        .end(done);
    });
  });
});

describe('The /charge endpoint dealt statuses', function () {
  var charge_allowed_statuses = [
    {
      name: 'authorisation success',
      view: "AUTHORISATION_SUCCESS"
    },
    {
      name: 'authorisation rejected',
      view: "AUTHORISATION_REJECTED"
    },
    {
      name: 'authorisation cancelled',
      view: "AUTHORISATION_CANCELLED"
    },
    {
      name: 'authorisation 3ds required',
      view: "AUTHORISATION_3DS_REQUIRED"
    },
    {
      name: 'system error',
      view: "SYSTEM_ERROR"
    },
    {
      name: 'captured',
      view: "CAPTURED"
    },
    {
      name: 'capture failure',
      view: "CAPTURE_FAILURE"
    },
    {
      name: 'capture submitted',
      view: "CAPTURE_SUBMITTED"
    },
    {
      name: 'expired',
      view: 'EXPIRED'
    },
    {
      name: 'system cancelled',
      view: 'SYSTEM_CANCELLED'
    },
    {
      name: 'created',
      view: 'CREATED'
    },
    {
      name: 'capture error',
      view: 'CAPTURE_ERROR'
    },
    {
      name: 'expire cancel ready',
      view: 'EXPIRE_CANCEL_READY'
    },
    {
      name: 'expire cancel failed',
      view: 'EXPIRE_CANCEL_FAILED'
    },
    {
      name: 'system cancel ready',
      view: "SYSTEM_CANCEL_READY"
    },
    {
      name: 'system cancel error',
      view: "SYSTEM_CANCEL_ERROR"
    },
    {
      name: 'user cancel ready',
      view: "USER_CANCEL_READY"
    },
    {
      name: 'user cancel error',
      view: "USER_CANCEL_ERROR"
    }
  ];
  beforeEach(function() {
    nock.cleanAll();
  });

  charge_allowed_statuses.forEach(function (state) {

    it('should not error when the payment status is ' + state.name, function (done) {
      nock(process.env.CONNECTOR_HOST)
      .get('/v1/frontend/charges/' + chargeId).reply(200, helper.raw_successful_get_charge(
        state.name,"http://www.example.com/service"
      ));

      request(app)
        .get(frontendCardDetailsPath + '/' + chargeId)
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .expect(function(res){
          helper.templateValue(res,"viewName", state.view);
          helper.templateValue(res,"chargeId", chargeId);
        })
        .end(done);
    });
  });
});


describe('The /confirm endpoint undealt statuses', function () {
  var confirm_not_allowed_statuses = [
    'CREATED',
    'AUTHORISATION SUBMITTED',
    'READY_FOR_CAPTURE'
  ];
  beforeEach(function() {
    nock.cleanAll();
  });

  afterEach(function() {
    nock.cleanAll();
  });




  confirm_not_allowed_statuses.forEach(function (status) {
    it('should error when the payment status is ' + status, function (done) {
      nock(process.env.CONNECTOR_HOST)
      .get('/v1/frontend/charges/' + chargeId).reply(200,helper.raw_successful_get_charge(
        status,"http://www.example.com/service"
      ));

      request(app)
        .get(frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .expect(500)
        .expect(function(res){
          helper.templateValue(res,"message", "There is a problem, please try again later");
        })
        .end(done);
    });
  });
});


describe('The /confirm endpoint dealt statuses', function () {
  var confirm_allowed_statuses = [
    {
      name: 'capture submitted',
      view: "CAPTURE_SUBMITTED",
      viewState: 'successful'
    },
    {
      name: 'captured',
      view: "CAPTURED",
      viewState: 'successful'
    },
    {
      name: 'capture failure',
      view: "CAPTURE_FAILURE"
    },
    {
      name: 'system error',
      view: "SYSTEM_ERROR"
    },
    {
      name: 'expired',
      view: 'EXPIRED'
    },
    {
      name: 'system cancelled',
      view: 'SYSTEM_CANCELLED'
    },
    {
      name: 'authorisation success',
      view: "AUTHORISATION_SUCCESS"
    },
    {
      name: 'authorisation rejected',
      view: "AUTHORISATION_REJECTED"
    },
    {
      name: 'authorisation ready',
      view: "AUTHORISATION_READY"
    },
    {
      name: 'authorisation 3ds required',
      view: "AUTHORISATION_3DS_REQUIRED"
    },
    {
      name: 'capture error',
      view: 'CAPTURE_ERROR'
    },
    {
      name: 'expire cancel ready',
      view: 'EXPIRE_CANCEL_READY'
    },
    {
      name: 'expire cancel failed',
      view: 'EXPIRE_CANCEL_FAILED'
    },
    {
      name: 'system cancel ready',
      view: "SYSTEM_CANCEL_READY"
    },
    {
      name: 'system cancel error',
      view: "SYSTEM_CANCEL_ERROR"
    },
    {
      name: 'user cancel ready',
      view: "USER_CANCEL_READY"
    },
    {
      name: 'user cancel error',
      view: "USER_CANCEL_ERROR"
    }
  ];
  beforeEach(function() {
    nock.cleanAll();
  });

  afterEach(function() {
    nock.cleanAll();
  });

  confirm_allowed_statuses.forEach(function (state) {
    it('should not error when the payment status is ' + state.name, function (done) {
      nock(process.env.CONNECTOR_HOST)
      .get('/v1/frontend/charges/' + chargeId).reply(200,helper.raw_successful_get_charge(
        state.name,"http://www.example.com/service"
      ));

      request(app)
        .get(frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .set('Cookie', ['frontend_state=' + cookie.create(chargeId)])
        .expect(function(res){
          helper.templateValue(res,"viewName", state.view);
          if (state.viewState) helper.templateValue(res,"status", state.viewState);
        })
        .end(done);
    });
  });
});
