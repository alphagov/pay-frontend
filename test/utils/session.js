var clientSessions = require("client-sessions");
var frontendCookie = require(__dirname + '/../../app/utils/cookies.js').frontendCookie;

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

      return clientSessions.util.encode(frontendCookie(), session);
    },

    decrypt: function decryptCookie(res, chargeId) {
      var content = clientSessions.util.decode(frontendCookie(), res.headers['set-cookie'][0].split(";")[0].split("=")[1]).content;
      return chargeId ? content[createSessionChargeKey(chargeId)] : content;
    }

};
