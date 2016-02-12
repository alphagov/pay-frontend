var should = require('chai').should();
var assert = require('assert');
var cookies  = require(__dirname + '/../app/utils/cookies.js');

describe('frontend cookie', function () {

  it('should have the correct structure', function () {
    assert.equal('frontend_state', cookies.fronendCookie().cookieName);
    assert.equal(true, cookies.fronendCookie().proxy);
    assert.deepEqual({httpOnly: true, secureProxy: true}, cookies.fronendCookie().cookie);
  });

});
