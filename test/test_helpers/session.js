/*jslint node: true */
"use strict";
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
	chargeSession.csrfSecret = process.env.CSRF_USER_SECRET;
	chargeSession.cardTypes = cardTypes();
	var session = {};
	if (arguments.length > 0) {
		session[createSessionChargeKey(chargeId)] = chargeSession;
		session[createReturnUrlKey(chargeId)] = encodeURIComponent(returnUrl);
	}

	return clientSessions.util.encode(frontendCookie(), session);
}

function createSessionWithReturnUrlDebitOnly(chargeId, chargeSession, returnUrl) {
	chargeSession = chargeSession || {};
	chargeSession.csrfSecret = process.env.CSRF_USER_SECRET;
	chargeSession.cardTypes = [{
		brand: "visa",
	  debit: true,
	  credit: false
	}];
	var session = {};
	if (arguments.length > 0) {
		session[createSessionChargeKey(chargeId)] = chargeSession;
		session[createReturnUrlKey(chargeId)] = encodeURIComponent(returnUrl);
	}

	return clientSessions.util.encode(frontendCookie(), session);
}

function cardTypes(){
	return [
	  {
	    brand: "visa",
	    debit: true,
	    credit: true
	  },
	  {
	    brand: "master-card",
	    debit: true,
	    credit: true
	  },
	  {
	    brand: "american-express",
	    debit: false,
	    credit: true
	  },
	  {
	    brand: "jcb",
	    debit: true,
	    credit: true
	  },
	  {
	    brand: "diners-club",
	    debit: true,
	    credit: true
	  },
	  {
	    brand: "discover",
	    debit: true,
	    credit: true
	  }
	];
}

module.exports = {
	createWithReturnUrl : function (chargeId, chargeSession, returnUrl) {
		return createSessionWithReturnUrl(chargeId, chargeSession, returnUrl);
	},

	create : function (chargeId, chargeSession) {
		return createSessionWithReturnUrl(chargeId, chargeSession, undefined);
	},

	createWithDebitOnly : function (chargeId, chargeSession) {
		return createSessionWithReturnUrlDebitOnly(chargeId, chargeSession, undefined);
	},

	decrypt: function decryptCookie(res, chargeId) {
	  var content = clientSessions.util.decode(frontendCookie(), res.headers['set-cookie'][0].split(";")[0].split("=")[1]).content;
	  return chargeId ? content[createSessionChargeKey(chargeId)] : content;
	},
	cardTypes: cardTypes
};
