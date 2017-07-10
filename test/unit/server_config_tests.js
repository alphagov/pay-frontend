'use strict'

const request = require('supertest')
const {expect} = require('chai')

const app = require('../../server').getApp

describe('server config:', () => {
  it(`should not return the 'x-powered-by' header by default`, done => {
    request(app)
      .get('/')
      .end((err, res) => {
        expect(err).to.equal(null)
        expect(res.headers['x-powered-by']).to.equal(undefined)
        done()
      })
  })
})
