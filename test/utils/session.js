var clientSessions = require("client-sessions");

var sessionConfig = {
    'cookieName': 'session_state',
    'secret':     process.env.SESSION_ENCRYPTION_KEY
};

module.exports = {
    createCookieValue : function () {
        var params = arguments;
        var sessionMap = {};
        for(var i = 0; i < params.length; i += 2) {
          sessionMap[params[i]] = params[i+1];
        }

        var cookieValue = clientSessions.util.encode(
          sessionConfig,
          sessionMap
        );

        return cookieValue;
    },
    getCookieValue : function(encodedCookieString) {
        return clientSessions.util.decode(
          sessionConfig,
          encodedCookieString
        );
    }
};
