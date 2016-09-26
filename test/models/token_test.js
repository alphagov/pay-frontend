require(__dirname + '/../test_helpers/html_assertions.js');
var should    = require('chai').should();
var assert    = require('assert');
var Token     = require(__dirname + '/../../app/models/token.js');
var nock      = require('nock');
var originalHost = process.env.CONNECTOR_HOST
var wrongPromise = require(__dirname + '/../test_helpers/test_helpers.js').unexpectedPromise;

describe('token model', function() {
  describe('destroy', function(){

    describe('when connector is unavailable', function () {
      before(function() {
        nock.cleanAll();
      });

      it('should return client unavailable', function () {
        var token = new Token('blah');
        return token.destroy(1).then(wrongPromise,
            function rejected(error){
              assert.equal(error.message,"CLIENT_UNAVAILABLE")
            });
      });
    });

    describe('when connector returns incorrect response code', function () {
      before(function() {
        nock.cleanAll();
        nock(originalHost, {
          reqheaders: {
            'X-Request-Id': 'blah'
          }
        })
          .delete("/v1/frontend/tokens/1")
          .reply(404, '<html></html>');
      });

      it('should return delete_failed', function () {
        var token = new Token('blah');
        return token.destroy(1).then(wrongPromise,
            function rejected(error){
              assert.equal(error.message,"DELETE_FAILED")
            });
      });
    });

    describe('when connector returns correctly', function () {
      before(function() {
        nock.cleanAll();
        nock(originalHost, {
          reqheaders: {
            'X-Request-Id': 'unique-request-id'
          }
        })
          .delete("/v1/frontend/tokens/1")
          .reply(204);
      });

      it('should return delete_failed', function () {
        var token = new Token('unique-request-id');
        return token.destroy(1).then(function(data){
          //
          //assert.equal(data.foo,'bar');
        },wrongPromise);
      });
    });
  });
});

