var clientSessions = require("client-sessions");
var frontendCookie = require(__dirname + '/../../app/utils/cookies.js').frontendCookie;

function createSessionChargeKey(chargeId) {
	return 'ch_' + chargeId;
}

function createReturnUrlKey(chargeId) {
	return 'return_url_' + chargeId;
}

function createSessionWithReturnUrl(chargeId, chargeSession, returnUrl) {
	chargeSession = chargeSession || {};
	var session = {};
	if (arguments.length > 0) {
		session[createSessionChargeKey(chargeId)] = chargeSession;
		session[createReturnUrlKey(chargeId)] = encodeURIComponent(returnUrl);
	}

	return clientSessions.util.encode(frontendCookie(), session);
}

module.exports = {
	createWithReturnUrl : function (chargeId, chargeSession, returnUrl) {
		return createSessionWithReturnUrl(chargeId, chargeSession, returnUrl);
	},

	create : function (chargeId, chargeSession) {
		return createSessionWithReturnUrl(chargeId, chargeSession, undefined);
	},

	decrypt: function decryptCookie(res, chargeId) {
	  var content = clientSessions.util.decode(frontendCookie(), res.headers['set-cookie'][0].split(";")[0].split("=")[1]).content;
	  return chargeId ? content[createSessionChargeKey(chargeId)] : content;
	}

};
