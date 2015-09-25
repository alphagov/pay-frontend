var clientSessions = require("client-sessions");

var sessionConfig = {
    'cookieName': 'session_state',
    'secret':     process.env.SESSION_ENCRYPTION_KEY
};

function createSessionChargeKey(chargeId) {
  return 'ch_' + chargeId;
}

module.exports = {
    create : function (chargeId, chargeSession) {
      chargeSession = chargeSession || {};
      var session = {};
      if (arguments.length > 0) {
        session[createSessionChargeKey(chargeId)] = chargeSession;
      }

      return clientSessions.util.encode(sessionConfig, session);
    },

    decrypt: function decryptCookie(res, chargeId) {
      var content = clientSessions.util.decode(sessionConfig, res.headers['set-cookie'][0].split(";")[0].split("=")[1]).content;
      return chargeId ? content[createSessionChargeKey(chargeId)] : content;
    }

};
