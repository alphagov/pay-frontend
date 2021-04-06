'use strict'

// NPM dependencies
const { expect } = require('chai')
const request = require('supertest')
const nock = require('nock')

// Local constants
const { APPLE_PAY_MERCHANT_ID, APPLE_PAY_MERCHANT_DOMAIN } = process.env

// Local dependencies
const { getApp } = require('../../../../server')
const paths = require('../../../../app/paths')
require('../../../test_helpers/html_assertions')

describe('Validate with Apple the merchant is legitimate', () => {
  it('should return a payload if Merchant is valid', done => {
    const url = 'https://fakeapple.url'
    const body = {
      merchantIdentifier: APPLE_PAY_MERCHANT_ID,
      displayName: 'GOV.UK Pay',
      initiative: 'web',
      initiativeContext: APPLE_PAY_MERCHANT_DOMAIN
    }
    const response = { encryptedThing: 'cryptoMagic' }

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

  it('should return an error if Merchant is invalid, the merchant details or crypto stuff', done => {
    const url = 'https://fakeapple.url'
    const body = {
      merchantIdentifier: APPLE_PAY_MERCHANT_ID,
      displayName: 'GOV.UK Pay',
      initiative: 'web',
      initiativeContext: APPLE_PAY_MERCHANT_DOMAIN
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
