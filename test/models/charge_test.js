require(__dirname + '/../utils/html_assertions.js');
var should    = require('chai').should();
var assert    = require('assert');
var Charge    = require(__dirname + '/../../app/models/charge.js');
var nock      = require('nock');
// TODO SPEAK TO IAIN ABOUT THIS
var originalHost = process.env.CONNECTOR_HOST
var wrongPromise = require(__dirname + '/../utils/test_helpers.js').unexpectedPromise;



describe('when connector is unavailable', function () {
  before(function() {
    process.env.CONNECTOR_HOST = "http://unavailableServer:65535"
  });

  after(function() {
    process.env.CONNECTOR_HOST = originalHost;
  });

  it('should return client unavailable', function () {
      return Charge.updateStatus(1,'ENTERING CARD DETAILS').then(wrongPromise,
        function rejected(error){
          assert.equal(error.message,"CLIENT_UNAVAILABLE")
      });
  });
});


describe('when connector returns wrong response to update', function () {
  before(function() {
    nock(originalHost)
    .put("/v1/frontend/charges/1/status")
    .reply(422, '<html></html>')
  });


  it('should return update_failed', function () {
    return Charge.updateStatus(1,'ENTERING CARD DETAILS').then(wrongPromise,
      function rejected(error){
        assert.equal(error.message,"UPDATE_FAILED")
    });
  });
});


describe('when connector returns correct from update but not get', function () {
  before(function() {
    nock(originalHost)
    .put("/v1/frontend/charges/1/status")
    .reply(204);

    nock(originalHost)
    .get("/v1/frontend/charges/1")
    .reply(201, '<html></html>');
  });


  it('should return get_failed', function () {
    return Charge.updateStatus(1,'ENTERING CARD DETAILS').then(wrongPromise,
      function rejected(error){
        assert.equal(error.message,"GET_FAILED")
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
    return Charge.updateStatus(1,'ENTERING CARD DETAILS')
    .then(function(data){
      assert.equal(data.foo,'bar');
    },wrongPromise);
  });
});


