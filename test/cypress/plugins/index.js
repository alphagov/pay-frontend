const util = require('util')
const request = require('request')
const lodash = require('lodash')

const requestPromise = util.promisify(request)

const stubGenerators = require('./stubs')

module.exports = (on, config) => {
  const stubServerURL = `${config.env.MOUNTEBANK_URL}/imposters`

  // common task definitions - used by all test specs
  on('task', {
    setupStubs (specs) {
      // spec has name and options - passed into stub generator for a given name
      // @TODO(sfount) clearly define what this method expects, consider how this name lookup works
      const stubs = lodash.flatMap(specs, spec => stubGenerators[spec.name](spec.opts))

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
    }
  })
  return config
}
