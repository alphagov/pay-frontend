var clientSessions = require("client-sessions");

var sessionConfig = {
    'cookieName': 'session_state',
    'secret':     process.env.SESSION_ENCRYPTION_KEY
};

module.exports = {
    createCookieValue : function (sessionMap, chargeId) {
      if (arguments.length > 1) {
        sessionMap['ch_' + chargeId] = true;
      }

      return clientSessions.util.encode(sessionConfig, sessionMap);
    },

    getCookieValue : function(encodedCookieString) {
        return clientSessions.util.decode(
          sessionConfig,
          encodedCookieString
        );
    }
};
