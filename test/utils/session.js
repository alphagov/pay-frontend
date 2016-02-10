var clientSessions = require("client-sessions");
var fronendCookie = require(__dirname + '/../../app/utils/cookies.js').fronendCookie;

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

      return clientSessions.util.encode(fronendCookie(), session);
    },

    decrypt: function decryptCookie(res, chargeId) {
      var content = clientSessions.util.decode(fronendCookie(), res.headers['set-cookie'][0].split(";")[0].split("=")[1]).content;
      return chargeId ? content[createSessionChargeKey(chargeId)] : content;
    }

};
