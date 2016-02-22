require(__dirname + '/../test_helpers/html_assertions.js');
var should = require('chai').should();
var assert = require('assert');
var chargeParam  = require(__dirname + '/../../app/services/charge_param_retriever.js');



describe('charge param retreiver', function () {
  var EMPTY_RESPONSE = { params: {}, body: {} },

  NO_SESSION_GET_RESPONSE = {
    params: { chargeId: "foo" },
    body: {},
    method: 'GET'
  },

  NO_SESSION_POST_RESPONSE = {
    params: {},
    body: { chargeId: "foo" },
    method: 'POST'
  },

  VALID_GET_RESPONSE = {
    params: { chargeId: "foo" },
    body: {},
    method: 'GET',
    frontend_state: { ch_foo: true }
  },

  VALID_POST_RESPONSE = {
    params: {},
    body: { chargeId: "foo" },
    method: 'POST',
    frontend_state: { ch_foo: true }
  };


  it('should return false if the charge param is not present in params or body', function () {
      assert.equal(chargeParam.retrieve(EMPTY_RESPONSE),false);
  });

  it('should return false if the charge param is in params but not in session', function () {
      assert.equal(chargeParam.retrieve(NO_SESSION_GET_RESPONSE),false);
  });

  it('should return false if the charge param is in THE BODY but not in session', function () {
      assert.equal(chargeParam.retrieve(NO_SESSION_POST_RESPONSE),false);
  });

  it('should return THE ID if the charge param is in params and has session', function () {
      assert.equal(chargeParam.retrieve(VALID_GET_RESPONSE),"foo");
  });

  it('should return false if the charge param is in THE BODY and has session', function () {
      assert.equal(chargeParam.retrieve(VALID_POST_RESPONSE),"foo");
  });

});
