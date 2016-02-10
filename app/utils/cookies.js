'use strict';

module.exports = function () {

  function cookieOpts() {

    var cookieOpts = {httpOnly: true};
    if (process.env.NODE_ENV === 'production') {
       cookieOpts.secure = true;
    }
    return cookieOpts;
  }

  function namedCookie(name) {
    return {
      cookieName: name,
      proxy: true,
      secret: process.env.SESSION_ENCRYPTION_KEY,
      cookie: cookieOpts()
    };
  }

  var fronendCookie = function () {
    return namedCookie('frontend_state');
  };

  return {
    fronendCookie: fronendCookie,
  }

}();
