const util = require('util')
const request = require('request')

const requestPromise = util.promisify(request)

const cookieMonster = require('./cookie-monster')

module.exports = (on, config) => {
  const stubServerURL = `${config.env.MOUNTEBANK_URL}/imposters`

  // common task definitions - used by all test specs
  on('task', {
    /**
     * Makes a post request to Mountebank to setup an Imposter with stubs built using the array of
     * stubs
     *
     * Note: this task can only be called once per test, so all stubs for a test must be set up in
     * the same call.
     */
    setupStubs (stubs) {
      return requestPromise({
        method: 'POST',
        url: stubServerURL,
        json: true,
        body: {
          port: config.env.MOUNTEBANK_IMPOSTERS_PORT,
          protocol: 'http',
          stubs
        }
      })
    },

    clearStubs () {
      return requestPromise.delete(stubServerURL)
    },

    generateSessionCookie (chargeId) {
      const encryptedCookie = cookieMonster.getCookie('frontend_state', config.env.TEST_SESSION_ENCRYPTION_KEY, `ch_${chargeId}`)
      return encryptedCookie
    }
  })
  return config
}
