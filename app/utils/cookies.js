const clientSessions = require('client-sessions')

const SESSION_COOKIE_NAME_1 = 'frontend_state'
const SESSION_COOKIE_NAME_2 = 'frontend_state_2'
const KEY_MIN_LENGTH = 10

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
      maxAge: parseInt(process.env.COOKIE_MAX_AGE),
      httpOnly: true,
      secureProxy: (process.env.SECURE_COOKIE_OFF !== 'true') // default is true, only false if the env variable present
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
  let key1 = process.env.SESSION_ENCRYPTION_KEY
  let key2 = process.env.SESSION_ENCRYPTION_KEY_2

  if (!isValidKey(key1) && !isValidKey(key2)) {
    throw new Error('cookie encryption key is not set')
  }

  if (process.env.COOKIE_MAX_AGE === undefined) {
    throw new Error('cookie max age is not set')
  }

  if (isValidKey(key1)) {
    app.use(clientSessions(namedCookie(SESSION_COOKIE_NAME_1, key1)))
  }

  if (isValidKey(key2)) {
    app.use(clientSessions(namedCookie(SESSION_COOKIE_NAME_2, key2)))
  }
}

/**
 * Returns current 'active' cookie name based on
 * existing env vars. Favours `SESSION_ENCRYPTION_KEY`
 * over `SESSION_ENCRYPTION_KEY_2`
 *
 * @returns {string}
 */
function getSessionCookieName () {
  if (isValidKey(process.env.SESSION_ENCRYPTION_KEY)) {
    return SESSION_COOKIE_NAME_1
  }

  if (isValidKey(process.env.SESSION_ENCRYPTION_KEY_2)) {
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
  if (process.env.SESSION_ENCRYPTION_KEY) {
    setValueOnCookie(req, key, value, SESSION_COOKIE_NAME_1)
  }

  if (process.env.SESSION_ENCRYPTION_KEY_2) {
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
  let session = req[getSessionCookieName()]

  return session && session[key]
}

module.exports = {
  configureSessionCookie: configureSessionCookie,
  getSessionCookieName: getSessionCookieName,
  setSessionVariable: setSessionVariable,
  getSessionVariable: getSessionVariable,
  namedCookie: namedCookie
}
