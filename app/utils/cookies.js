'use strict';

/**
 * Constructs the cookie structure required by client-sessions.js
 * The property 'secureProxy:true' makes the cookie to be secured if 'X-Forwarded-Proto: https' header is present in request
 */
module.exports = function () {

  function namedCookie(name) {
    return {
      cookieName: name,
      proxy: true,
      secret: process.env.SESSION_ENCRYPTION_KEY,
      cookie: {
        httpOnly: true,
        secureProxy: true
      }
    };
  }

  var fronendCookie = function () {
    return namedCookie('frontend_state');
  };

  return {
    fronendCookie: fronendCookie
  }

}();
