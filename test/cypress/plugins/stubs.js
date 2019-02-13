// get fixture definitions
// const exampleFixture = require('./../../fixtures/example')

const JSONRequestHeader = { 'Accept': 'application/json' }
const JSONResponseHeader = { 'Content-Type': 'application/json' }

module.exports = {
  example: (opts = {}) => {
    // const validExampleResponse = exampleFixture.response(opts)
    const validExampleResponse = {}
    const stub = {
      predicates: [{
        equals: {
          method: 'GET',
          path: '/v1/api/example/',
          headers: JSONRequestHeader
        }
      }],
      responses: [{
        is: {
          statusCode: 200,
          headers: JSONResponseHeader,
          body: validExampleResponse
        }
      }]
    }
    return [ stub ]
  }
}
