'use strict'

// npm dependencies
const clientSessions = require('client-sessions')

// constants
const {COOKIE_MAX_AGE, SESSION_ENCRYPTION_KEY, SESSION_ENCRYPTION_KEY_2, SECURE_COOKIE_OFF} = process.env
const SESSION_COOKIE_NAME_1 = 'frontend_state'
const SESSION_COOKIE_NAME_2 = 'frontend_state_2'
const KEY_MIN_LENGTH = 10

module.exports = {
  configureSessionCookie: configureSessionCookie,
  getSessionCookieName: getSessionCookieName,
  setSessionVariable: setSessionVariable,
  getSessionVariable: getSessionVariable,
  namedCookie: namedCookie
}

/**
 * @private
 *
 * @param {object} req
 * @param {string} key
 * @param {*} value
 * @param {string} cookieName
 */
function setValueOnCookie (req, key, value, cookieName) {
  if (typeof req[cookieName] === 'object') {
    req[cookieName][key] = value
  }
}

/**
 * @private
 *
 * @param {string} key
 * @returns {boolean}
 */
function isValidKey (key) {
  return !!key && typeof key === 'string' && key.length > KEY_MIN_LENGTH
}

/**
 * Returns valid client-sessions configuration for supplied
 * cookie name and encryption key
 **
 * @param {string} name
 * @param {string} key
 *
 * @returns {object}
 * */
function namedCookie (name, key) {
  return {
    cookieName: name,
    proxy: true,
    secret: key,
    cookie: {
      maxAge: parseInt(COOKIE_MAX_AGE),
      httpOnly: true,
      secureProxy: SECURE_COOKIE_OFF !== 'true' // default is true, only false if the env variable present
    }
  }
}

/**
 * Initialises app with client_sessions middleware.
 * Configures one middleware per existing encryption key, to enable multiple
 * keys to exist simultaneously, allowing key rotation.
 *
 * @param {Express.App} app
 */
function configureSessionCookie (app) {
  if (!isValidKey(SESSION_ENCRYPTION_KEY) && !isValidKey(SESSION_ENCRYPTION_KEY_2)) {
    throw new Error('cookie encryption key is not set')
  } else if (!COOKIE_MAX_AGE) {
    throw new Error('cookie max age is not set')
  }

  if (isValidKey(SESSION_ENCRYPTION_KEY)) app.use(clientSessions(namedCookie(SESSION_COOKIE_NAME_1, SESSION_ENCRYPTION_KEY)))
  if (isValidKey(SESSION_ENCRYPTION_KEY_2)) app.use(clientSessions(namedCookie(SESSION_COOKIE_NAME_2, SESSION_ENCRYPTION_KEY_2)))
}

/**
 * Returns current 'active' cookie name based on
 * existing env vars. Favours `SESSION_ENCRYPTION_KEY`
 * over `SESSION_ENCRYPTION_KEY_2`
 *
 * @returns {string}
 */
function getSessionCookieName () {
  if (isValidKey(SESSION_ENCRYPTION_KEY)) {
    return SESSION_COOKIE_NAME_1
  } else if (isValidKey(SESSION_ENCRYPTION_KEY_2)) {
    return SESSION_COOKIE_NAME_2
  }
}

/**
 * Sets session[key] = value for all valid sessions, based on existence of encryption key,
 * and the existence of relevant cookie on the request
 *
 * @param {Request} req
 * @param {string} key
 * @param {*} value
 */
function setSessionVariable (req, key, value) {
  if (SESSION_ENCRYPTION_KEY) {
    setValueOnCookie(req, key, value, SESSION_COOKIE_NAME_1)
  }

  if (SESSION_ENCRYPTION_KEY_2) {
    setValueOnCookie(req, key, value, SESSION_COOKIE_NAME_2)
  }
}

/**
 * Gets value of key from session, based on existence of encryption key
 *
 * @param {Request} req
 * @param {string} key
 * @returns {*}
 */
function getSessionVariable (req, key) {
  const session = req[getSessionCookieName()]

  return session && session[key]
}
