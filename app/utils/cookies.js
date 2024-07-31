'use strict'

const clientSessions = require('client-sessions')
const { chargeStateFromString, epochSecondsNow } = require('../models/ChargeState')
const logger = require('../utils/logger')(__filename)

// Constants
const { COOKIE_MAX_AGE, SESSION_ENCRYPTION_KEY, SESSION_ENCRYPTION_KEY_2, SECURE_COOKIE_OFF } = process.env
const SESSION_COOKIE_NAME_1 = 'frontend_state'
const SESSION_COOKIE_NAME_2 = 'frontend_state_2'
const KEY_MIN_LENGTH = 10

module.exports = {
  configureSessionCookie,
  getSessionCookieName,
  setSessionVariable,
  getSessionVariable,
  namedCookie,
  deleteSessionVariable,
  isSessionPresent,
  getChargesOnSession,
  getSessionCsrfSecret,
  getSessionChargeState,
  setSessionChargeState,
  findSessionChargeToDelete
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
  if (typeof req[cookieName] !== 'object') return
  if (typeof value === 'object') {
    req[cookieName][key] = Object.assign(req[cookieName][key] || {}, value)
  } else {
    req[cookieName][key] = value
  }
}

/**
 * @private
 *
 * @param {object} req
 * @param {string} key
 * @param {string} cookieName
 */
function deleteValueOnCookie (req, key, cookieName) {
  if (typeof req[cookieName] !== 'object') return
  delete req[cookieName][key]
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
 * Deletes session[key] for all valid sessions, based on existence of encryption key,
 * and the existence of relevant cookie on the request
 *
 * @param {Request} req
 * @param {string} key
 */
function deleteSessionVariable (req, key) {
  logger.info('Deleting session variable', {
    session_variable_name: key
  })
  if (SESSION_ENCRYPTION_KEY) {
    deleteValueOnCookie(req, key, SESSION_COOKIE_NAME_1)
  }
  if (SESSION_ENCRYPTION_KEY_2) {
    deleteValueOnCookie(req, key, SESSION_COOKIE_NAME_2)
  }
}

/**
 * @param {Request} req
 * @returns {string}
 */
function findSessionChargeToDelete (req) {
  const now = epochSecondsNow()
  const yesterday = now - 86400
  const ninetyMinutesAgo = now - 5400

  const chargesSortedByAccessedDate = getChargesOnSession(req)
    .map(chargeId => {
      return {
        chargeId,
        state: getSessionChargeState(req, chargeId)
      }
    })
    .sort(({ state: a }, { state: b }) => a.accessedAt - b.accessedAt)

  logger.info(`User session contains ${chargesSortedByAccessedDate.length} charges`)

  const leastRecentlyAccessedChargeCreatedMoreThanTwentyFourHoursAgo = chargesSortedByAccessedDate.find(charge => charge.state.createdAt < yesterday)

  if (leastRecentlyAccessedChargeCreatedMoreThanTwentyFourHoursAgo) {
    return leastRecentlyAccessedChargeCreatedMoreThanTwentyFourHoursAgo.chargeId
  }

  const leastRecentlyAccessedTerminalCharge = chargesSortedByAccessedDate.find(charge => charge.state.isTerminal)

  if (leastRecentlyAccessedTerminalCharge) {
    return leastRecentlyAccessedTerminalCharge.chargeId
  }

  const leastRecentlyAccessedChargeCreatedMoreThanNinetyMinutesAgo = chargesSortedByAccessedDate.find(charge => charge.state.createdAt < ninetyMinutesAgo)

  if (leastRecentlyAccessedChargeCreatedMoreThanNinetyMinutesAgo) {
    return leastRecentlyAccessedChargeCreatedMoreThanNinetyMinutesAgo.chargeId
  }

  logger.info('No preferred charges found for deletion on session, defaulting to least recently accessed charge')
  const leastRecentlyAccessedCharge = chargesSortedByAccessedDate[0]
  return leastRecentlyAccessedCharge.chargeId
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
 * @param {Request} req
 * @param {string} key
 * @param {ChargeState} chargeState
 */
function setSessionChargeState (req, key, chargeState) {
  const chargeStateObject = {
    data: chargeState.toString()
  }
  setSessionVariable(req, key, chargeStateObject)
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
  return session && session?.[key]
}

/**
 * @param {Request} req
 * @param {string} key
 * @returns {ChargeState}
 */
function getSessionChargeState (req, key) {
  return chargeStateFromString(getSessionVariable(req, key).data)
}

/**
 * @param {Request} req
 * @returns {string}
 */
function getSessionCsrfSecret (req) {
  return getSessionVariable(req, 'csrfSecret')
}

function isSessionPresent (req) {
  const session = req[getSessionCookieName()]
  return session && Object.getOwnPropertyNames(session).length > 0
}

/**
 * @param {Request} req
 * @returns {string[]}
 */
function getChargesOnSession (req) {
  const session = req[getSessionCookieName()]
  return Object.keys(session).filter(key => {
    return key.startsWith('ch_') && Object.keys(session[key]).includes('data')
  })
}
