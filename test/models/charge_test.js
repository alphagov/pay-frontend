require(__dirname + '/../test_helpers/html_assertions.js');
var should    = require('chai').should();
var assert    = require('assert');
var Charge    = require(__dirname + '/../../app/models/charge.js');
var nock      = require('nock');
var originalHost = process.env.CONNECTOR_HOST
var wrongPromise = require(__dirname + '/../test_helpers/test_helpers.js').unexpectedPromise;

describe('updateStatus',function(){

  describe('when connector is unavailable', function () {
    beforeEach(function() {
      nock.cleanAll();
      process.env.CONNECTOR_HOST = "http://unavailableServer:65535"
    });

    afterEach(function() {
      process.env.CONNECTOR_HOST = originalHost;
    });

    it('should return client unavailable', function () {
        var chargeModel = Charge('');
        return chargeModel.updateStatus(1,'ENTERING CARD DETAILS').then(wrongPromise,
          function rejected(error){
            assert.equal(error.message,"CLIENT_UNAVAILABLE")
        });
    });
  });

  describe('when connector returns wrong response', function () {
    before(function() {
      nock.cleanAll();
      nock(originalHost)
      .put("/v1/frontend/charges/1/status")
      .reply(422, '{}')
    });


    it('should return update_failed', function () {
      var chargeModel = Charge('');
      return chargeModel.updateStatus(1,'ENTERING CARD DETAILS').then(wrongPromise,
        function rejected(error){
          assert.equal(error.message,"UPDATE_FAILED")
      });
    });
  });

  describe('it returns everything correctly', function () {
    before(function() {
      nock(originalHost)
      .put("/v1/frontend/charges/1/status")
      .reply(204);

      nock(originalHost)
      .get("/v1/frontend/charges/1")
      .reply(200, {foo: 'bar'});
    });


    it('should return the correct json', function () {
      var chargeModel = Charge('');
      return chargeModel.updateStatus(1,'ENTERING CARD DETAILS')
      .then(function(data,response){
        assert.equal(data.success,'OK');
      },wrongPromise);
    });
  });

});

describe('find',function(){

  describe('when connector is unavailable', function () {
    before(function() {
      nock.cleanAll();
    });

    it('should return client unavailable', function () {
      var chargeModel = Charge('');
      return chargeModel.find(1).then(wrongPromise,
        function rejected(error){
          assert.equal(error.message,"CLIENT_UNAVAILABLE")
      });
    });
  });


  describe('when connector returns incorrect response code', function () {
    before(function() {
      nock.cleanAll();

      nock(originalHost)
      .get("/v1/frontend/charges/1")
      .reply(404, '{}');
    });

    it('should return get_failed', function () {
      var chargeModel = Charge('');
      return chargeModel.find(1).then(wrongPromise,
        function rejected(error){
          assert.equal(error.message,"GET_FAILED")
      });
    });
  });


  describe('when connector returns correctly', function () {
    before(function() {
      nock.cleanAll();

      nock(originalHost)
      .get("/v1/frontend/charges/1")
      .reply(200, {foo: "bar"});
    });

    it('should return get_failed', function () {
      var chargeModel = Charge('');
      return chargeModel.find(1).then(function(data){
        assert.equal(data.foo,'bar');
      },wrongPromise);
    });
  });
});

describe('capture',function(){
  describe('when connector returns with 204 it should resolve the correct promise', function () {
    before(function() {
      nock.cleanAll();

      nock(originalHost)
      .post("/v1/frontend/charges/1/capture")
      .reply(204);
    });

    it('should return into the correct promise', function () {
      var chargeModel = Charge('');
      return chargeModel.capture(1).then(function(){
        // correct promise returned so no need to check anything
      },wrongPromise);
    });
  });


  describe('when connector is unavailable', function () {
    before(function() {
      nock.cleanAll();
    });

    it('should return CLIENT_UNAVAILABLE when post fails', function () {
      var chargeModel = Charge('');
      return chargeModel.capture(1).then(wrongPromise,
        function rejected(error){
          assert.equal(error.message,"CLIENT_UNAVAILABLE");
      });
    });
  });


  describe('when connector returns with auth failed should return error CAPTURE_FAILED', function () {
    before(function() {
      nock.cleanAll();

      nock(originalHost)
      .post("/v1/frontend/charges/1/capture")
      .reply(400);
    });

    it('should return AUTH_FAILED', function () {
      var chargeModel = Charge('');
      return chargeModel.capture(1).then(wrongPromise,
        function rejected(error){
          assert.equal(error.message,"CAPTURE_FAILED")
      });
    });
  });

  describe('when connector returns with ! (204||400) should return error POST_FAILED', function () {
    before(function() {
      nock.cleanAll();

      nock(originalHost)
      .post("/v1/frontend/charges/1/capture")
      .reply(410);
    });

    it('should return AUTH_FAILED', function () {
      var chargeModel = Charge('');
      return chargeModel.capture(1).then(wrongPromise,
        function rejected(error){
          assert.equal(error.message,"POST_FAILED")
      });
    });
  });
});

describe('findByToken',function(){

  describe('when connector is unavailable', function () {
    before(function() {
      nock.cleanAll();
    });

    it('should return client unavailable', function () {
      var chargeModel = Charge('');
      return chargeModel.findByToken(1).then(wrongPromise,
          function rejected(error){
            assert.equal(error.message,"CLIENT_UNAVAILABLE")
          });
    });
  });

  describe('when connector returns incorrect response code', function () {
    before(function() {
      nock.cleanAll();

      nock(originalHost)
          .get("/v1/frontend/tokens/1/charge")
          .reply(404, '{}');
    });

    it('should return get_failed', function () {
      var chargeModel = Charge('');
      return chargeModel.findByToken(1).then(wrongPromise,
          function rejected(error){
            assert.equal(error.message,"GET_FAILED")
          });
    });
  });

  describe('when connector returns correctly', function () {
    before(function() {
      nock.cleanAll();

      nock(originalHost)
          .get("/v1/frontend/tokens/1/charge")
          .reply(200, {foo: "bar"});
    });

    it('should return get_failed', function () {
      var chargeModel = Charge('');
      return chargeModel.findByToken(1).then(function(data){
        assert.equal(data.foo,'bar');
      },wrongPromise);
    });
  });
});
