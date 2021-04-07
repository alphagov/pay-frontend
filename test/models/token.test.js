'use strict'

// NPM dependencies
const nock = require('nock')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai

// Local dependencies
const Token = require('../../app/models/token.js')
const wrongPromise = require('../test-helpers/test-helpers.js').unexpectedPromise

// Constants
const originalHost = process.env.CONNECTOR_HOST

// Configure
require('../test-helpers/html-assertions.js')

describe('token model', function () {
  describe('mark token as used', function () {
    describe('when connector is unavailable', function () {
      before(function () {
        nock.cleanAll()
      })
      it('should return client unavailable', function () {
        return expect(Token.markTokenAsUsed(1, 'blah')).to.be.rejectedWith(Error, 'CLIENT_UNAVAILABLE')
      })
    })

    describe('when connector returns incorrect response code', function () {
      before(function () {
        nock.cleanAll()
        nock(originalHost, {
          reqheaders: {
            'x-request-id': 'blah'
          }
        }).post('/v1/frontend/tokens/1/used')
          .reply(404, '{}')
      })

      it('should return delete_failed', function () {
        return expect(Token.markTokenAsUsed(1, 'blah')).to.be.rejectedWith(Error, 'MARKING_TOKEN_AS_USED_FAILED')
      })
    })

    describe('when connector returns correctly', function () {
      before(function () {
        nock.cleanAll()
        nock(originalHost, {
          reqheaders: {
            'x-request-id': 'unique-request-id'
          }
        }).post('/v1/frontend/tokens/1/used')
          .reply(204)
      })

      it('should return delete_failed', function () {
        return Token.markTokenAsUsed(1, 'unique-request-id').then(function (data) {
        }, wrongPromise)
      })
    })
  })
})
