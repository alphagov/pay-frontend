var should = require('chai').should();
var assert = require('assert');
var cookies  = require(__dirname + '/../app/utils/cookies.js');

describe('frontend cookie', function () {

  it('should have secure proxy off in unsecured environment', function () {
    process.env.SECURE_COOKIE_OFF = "true";
    assert.equal('frontend_state', cookies.frontendCookie().cookieName);
    assert.equal(true, cookies.frontendCookie().proxy);
    assert.deepEqual({httpOnly: true, secureProxy: false}, cookies.frontendCookie().cookie);
  });

  it('should have secure proxy on in a secured https environment', function () {
    process.env.SECURE_COOKIE_OFF="false";
    assert.equal('frontend_state',cookies.frontendCookie().cookieName);
    assert.equal(true, cookies.frontendCookie().proxy);
    assert.deepEqual({httpOnly: true, secureProxy: true}, cookies.frontendCookie().cookie);
  });

});