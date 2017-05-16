const clientSessions = require("client-sessions");

const SESSION_COOKIE_NAME_1 = 'frontend_state';
const SESSION_COOKIE_NAME_2 = 'frontend_state_2';

/**
 * Returns valid client_sessions configuration for supplied
 * cookie name and encryption key
 *
 * @private
 *
 * @param {string} name
 * @param {string} key
 *
 * @returns {object}
 * */
function namedCookie(name, key) {
  return {
    cookieName: name,
    proxy: true,
    secret: key,
    cookie: {
      maxAge: parseInt(process.env.COOKIE_MAX_AGE), //expires after 90 minutes
      httpOnly: true,
      secureProxy: (process.env.SECURE_COOKIE_OFF !== "true") // default is true, only false if the env variable present
    }
  };
}

/**
 * Initialises app with client_sessions middleware.
 * Configures one middleware per existing encryption key, to enable multiple
 * keys to exist simultaneously, allowing key rotation.
 *
 * @param {Express.App} app
 */
function configureSessionCookie(app) {
  let key1 = process.env.SESSION_ENCRYPTION_KEY;
  let key2 = process.env.SESSION_ENCRYPTION_KEY_2;

  if (key1 === undefined && key2 === undefined) {
    throw new Error('cookie encryption key is not set');
  }

  if (process.env.COOKIE_MAX_AGE === undefined) {
    throw new Error('cookie max age is not set');
  }

  if (key1 !== undefined) {
    app.use(clientSessions(namedCookie(SESSION_COOKIE_NAME_1, key1)));
  }

  if (key2 !== undefined) {
    app.use(clientSessions(namedCookie(SESSION_COOKIE_NAME_2, key2)));
  }
}

/**
 *
 * @returns {string}
 */
function getSessionCookieName() {
  if (process.env.SESSION_ENCRYPTION_KEY !== undefined) {
    return SESSION_COOKIE_NAME_1;
  }

  if (process.env.SESSION_ENCRYPTION_KEY_2 !== undefined) {
    return SESSION_COOKIE_NAME_2;
  }
}

/**
 * Sets session[key] = value for all valid sessions, based on existence of encryption key
 *
 * @param {Request} req
 * @param {string} key
 * @param {*} value
 */
function setSessionVariable(req, key, value) {
  if (process.env.SESSION_ENCRYPTION_KEY !== undefined) {
    req[SESSION_COOKIE_NAME_1][key] = value;
  }

  if (process.env.SESSION_ENCRYPTION_KEY_2 !== undefined) {
    req[SESSION_COOKIE_NAME_2][key] = value;
  }
}

/**
 * Gets value of key from session, based on existence of encryption key
 *
 * @param {Request} req
 * @param {string} key
 * @returns {*}
 */
function getSessionVariable(req, key) {
  let session = req[getSessionCookieName()];

  return session && session[key];
}

module.exports = {
  configureSessionCookie: configureSessionCookie,
  getSessionCookieName: getSessionCookieName,
  setSessionVariable: setSessionVariable,
  getSessionVariable: getSessionVariable,
  namedCookie: namedCookie
};
