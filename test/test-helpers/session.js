'use strict'

const clientSessions = require('client-sessions')
const cookies = require('../../app/utils/cookies.js')

function createSessionChargeKey (chargeId) {
  return 'ch_' + chargeId
}

function createReturnUrlKey (chargeId) {
  return 'return_url_' + chargeId
}

function createSessionWithReturnUrl (chargeId, chargeSession, returnUrl) {
  chargeSession = chargeSession || {}
  chargeSession.csrfSecret = process.env.CSRF_USER_SECRET
  const session = {}
  if (arguments.length > 0) {
    session[createSessionChargeKey(chargeId)] = chargeSession
    session[createReturnUrlKey(chargeId)] = encodeURIComponent(returnUrl)
  }

  return clientSessions.util.encode(cookies.namedCookie('frontend_state', process.env.SESSION_ENCRYPTION_KEY), session)
}

module.exports = {
  createWithReturnUrl: function (chargeId, chargeSession, returnUrl) {
    return createSessionWithReturnUrl(chargeId, chargeSession, returnUrl)
  },

  create: function (chargeId, chargeSession) {
    return createSessionWithReturnUrl(chargeId, chargeSession, undefined)
  },

  decrypt: function decryptCookie (res, chargeId) {
    const content = clientSessions.util.decode(cookies.namedCookie('frontend_state', process.env.SESSION_ENCRYPTION_KEY), res.headers['set-cookie'][0].split(';')[0].split('=')[1]).content
    return chargeId ? content[createSessionChargeKey(chargeId)] : content
  }
}
