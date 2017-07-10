const request = require('supertest')
const app = require('../../server.js').getApp
const expect = require('chai').expect

describe('The /healthcheck endpoint returned json', function () {
  it('should return 200 and be healthy', function (done) {
    const expectedResponse = {'ping': {'healthy': true}}
    request(app)
          .get('/healthcheck')
          .set('Accept', 'application/json')
          .expect(200)
          .expect(function (res) {
            var response = JSON.parse(res.text)
            expect(response).to.deep.equal(expectedResponse)
          }).end(done)
  })
})
