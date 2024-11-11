const axios = require('axios')

module.exports = (on, config) => {
  const stubSetupUrl = config.env.MOCK_HTTP_SERVER_URL + '/__add-mock-endpoints__'
  const stubResetUrl = config.env.MOCK_HTTP_SERVER_URL + '/__clear-mock-endpoints__'
  const createSnapshotUrl = config.env.MOCK_HTTP_SERVER_URL + '/__create-debug-snapshot__'

  // common task definitions - used by all test specs
  on('task', {
    /**
     * Makes a post request to @govuk-pay/run-amock to setup stubs built using the array of stubs
     *
     * Note: this task can only be called once per test, so all stubs for a test must be set up in
     * the same call.
     */
    setupStubs (stubs) {
      return axios.post(stubSetupUrl,
        {
          port: config.env.MOCK_HTTP_SERVER_PORT,
          protocol: 'http',
          stubs
        }
      ).then(function (response) {
        return ''
      })
        .catch(function (error) {
          throw error
        })
    },

    clearStubs () {
      return axios.post(stubResetUrl)
        .then(function (response) {
          return ''
        })
        .catch(function (error) {
          throw error
        })
    },
    /**
     * Makes a request to @govuk-pay to create a debug snapshot with whatever name is specified.
     */
    createDebugSnapshot (name) {
      return axios.post(createSnapshotUrl, {
        name
      })
        .then(function () { return '' })
        .catch(function (error) { throw error })
    }
  })
  return config
}
