'use strict'

const supertest = require('supertest')
const nock = require('nock')
const proxyquire = require('proxyquire')

const cookie = require('../test-helpers/session')
const paymentFixtures = require('../fixtures/payment.fixtures')

const app = proxyquire('../../server.js',
  {
    'memory-cache': {
      get: function () {
        return false
      },
      '@global': true
    }
  }).getApp()

describe('Client side logging tests', () => {
  const chargeId = '23144323'

  it('should return a 200 status code when cookie is present', (done) => {
    const cookieValue = cookie.create(chargeId)
    nock(process.env.CONNECTOR_HOST)
      .get('/v1/frontend/charges/' + chargeId).reply(200, paymentFixtures.validChargeDetails())
    supertest(app)
      .post('/log/' + chargeId)
      .set('Content-Type', 'application/json')
      .set('Cookie', ['frontend_state=' + cookieValue])
      .send({
        code: 'foo'
      })
      .expect(200)
      .end(done)
  })

  it('should return a 403 status code when cookie is not present', (done) => {
    supertest(app)
      .post('/log/' + chargeId)
      .set('Content-Type', 'application/json')
      .send({
        code: 'foo'
      })
      .expect(403)
      .end(done)
  })
})
