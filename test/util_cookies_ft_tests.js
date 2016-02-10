var should = require('chai').should();
var assert = require('assert');
var cookies  = require(__dirname + '/../app/utils/cookies.js');

describe('frontend cookie', function () {

  it('should have no secure opts when unsecured', function () {
    process.env.NODE_ENV = "development";
    assert.deepEqual({httpOnly: true}, cookies.fronendCookie().cookie);
    assert.equal('frontend_state', cookies.fronendCookie().cookieName);
  });

  it('should have secure opts when secured', function () {
    process.env.NODE_ENV = "production";
    assert.deepEqual({httpOnly: true, secure: true}, cookies.fronendCookie().cookie);
    assert.equal('frontend_state',cookies.fronendCookie().cookieName);
  });

});
