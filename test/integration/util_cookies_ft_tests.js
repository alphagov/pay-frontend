var should = require('chai').should();
var assert = require('assert');
var cookies  = require('../../app/utils/cookies.js');

describe('frontend cookie', function () {

  it('should have secure proxy off in unsecured environment', function () {
    process.env.SECURE_COOKIE_OFF = "true";
    assert.equal('frontend_state', cookies.getSessionCookieName());
    assert.equal(true, cookies.namedCookie('name', 'key').proxy);
    assert.deepEqual({httpOnly: true, secureProxy: false, maxAge: 5400000}, cookies.namedCookie('name', 'key').cookie);
  });

  it('should have secure proxy on in a secured https environment', function () {
    process.env.SECURE_COOKIE_OFF="false";
    assert.equal('frontend_state',cookies.getSessionCookieName());
    assert.equal(true, cookies.namedCookie('name', 'key').proxy);
    assert.deepEqual({httpOnly: true, secureProxy: true, maxAge: 5400000}, cookies.namedCookie('name', 'key').cookie);
  });
});
