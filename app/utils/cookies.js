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
        maxAge: parseInt(process.env.COOKIE_MAX_AGE), //expires after 90 minutes
        httpOnly: true,
        secureProxy: (process.env.SECURE_COOKIE_OFF !== "true") // default is true, only false if the env variable present
      }
    };
  }

  var frontendCookie = function () {
    if (process.env.SESSION_ENCRYPTION_KEY === undefined) throw new Error('cookie encryption key is not set');
    if (process.env.COOKIE_MAX_AGE === undefined) throw new Error('cookie max age is not set');
    return namedCookie('frontend_state');
  };

  return {
    frontendCookie: frontendCookie
  };

}();
