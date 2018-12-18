'use strict'

// NPM dependencies
const { expect } = require('chai')
const request = require('supertest')
const nock = require('nock')

// Local dependencies
const { getApp } = require('../../../server')
const paths = require('../../../app/paths')
require('../../test_helpers/html_assertions')

describe('Validate with Apple the merchant is legitimate', () => {
  it('should return a payload if Merchant is valid', done => {
    const url = 'https://fakeapple.url'
    const body = {
      merchantIdentifier: 'merchantID',
      displayName: 'GOV.UK Pay',
      initiative: 'web',
      initiativeContext: 'test.payments.service.gov.uk'
    }
    const response = { encryptedThing: 'crytoMagic' }

    nock(url)
      .post('/', body)
      .reply(200, response)

    request(getApp())
      .post(paths.applePay.session.path)
      .set('Accept', 'application/json')
      .send({
        url
      })
      .expect(200)
      .expect(res => {
        expect(res.body).to.deep.equal(response)
      })
      .end(done)
  })
  it('should return 400 if no url is provided', done => {
    request(getApp())
      .post(paths.applePay.session.path)
      .set('Accept', 'application/json')
      .expect(400)
      .end(done)
  })
  it('should return an error if Merchant is invalid', done => {
    const url = 'https://fakeapple.url'
    const body = {
      merchantIdentifier: 'merchantID',
      displayName: 'GOV.UK Pay',
      initiative: 'web',
      initiativeContext: 'test.payments.service.gov.uk'
    }

    nock(url)
      .post('/', body)
      .replyWithError('nope')

    request(getApp())
      .post(paths.applePay.session.path)
      .set('Accept', 'application/json')
      .send({
        url
      })
      .expect(500)
      .end(done)
  })
})
