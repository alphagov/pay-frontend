const request = require('supertest')
const app = require('../../server.js').getApp()
const expect = require('chai').expect

describe('Invalid pages redirect to 404 page', function () {
  it('should return 302 to gov.uk when not found', function (done) {
    request(app)
      .get('/notapage')
      .expect(302)
      .expect(res => expect(res.headers['location']).to.equal('https://www.gov.uk/404'))
      .end(done)
  })

  // it('should not return 302 to gov.uk when found', function (done) {
  //   request(app)
  //     .get('/')
  //     .expect(200)
  //     .expect(res => expect(res.headers['location']).to.not.equal('https://www.gov.uk/404'))
  //     .end(done)
  // })

  it('should not return 302 to gov.uk when static', function (done) {
    request(app)
      .get('/public/images/acc.png')
      .expect(200)
      .expect(res => expect(res.headers['location']).to.not.equal('https://www.gov.uk/404'))
      .end(done)
  })
})
