'use strict'

// Core dependencies
const path = require('path')

// NPM dependencies
const assert = require('assert')
const nock = require('nock')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai

// Local dependencies
require(path.join(__dirname, '/../test_helpers/html_assertions.js'))
const Charge = require(path.join(__dirname, '/../../app/models/charge.js'))
const { unexpectedPromise } = require(path.join(__dirname, '/../test_helpers/test_helpers.js'))

// Constants
const originalHost = process.env.CONNECTOR_HOST

describe('updateStatus', function () {
  describe('when connector is unavailable', function () {
    beforeEach(function () {
      nock.cleanAll()
      process.env.CONNECTOR_HOST = 'http://unavailableServer:65535'
    })

    afterEach(function () {
      process.env.CONNECTOR_HOST = originalHost
    })

    it('should return client unavailable', function () {
      const chargeModel = Charge('')
      return chargeModel.updateStatus(1, 'ENTERING CARD DETAILS').then(unexpectedPromise,
        function rejected (error) {
          assert.strictEqual(error.message, 'CLIENT_UNAVAILABLE')
        })
    })
  })

  describe('when connector returns wrong response', function () {
    before(function () {
      nock.cleanAll()
      nock(originalHost)
        .put('/v1/frontend/charges/1/status')
        .reply(422, {})
    })

    it('should return update_failed', function () {
      const chargeModel = Charge('')
      return chargeModel.updateStatus(1, 'ENTERING CARD DETAILS').catch(err => {
        assert.strictEqual(err.message, 'UPDATE_FAILED')
      })
    })
  })

  describe('it returns everything correctly', function () {
    before(function () {
      nock(originalHost)
        .put('/v1/frontend/charges/1/status')
        .reply(204)

      nock(originalHost)
        .get('/v1/frontend/charges/1')
        .reply(200, { foo: 'bar' })
    })

    it('should return the correct json', function () {
      const chargeModel = Charge('')
      return chargeModel.updateStatus(1, 'ENTERING CARD DETAILS')
        .then(function (data, response) {
          assert.strictEqual(data.success, 'OK')
        }, unexpectedPromise)
    })
  })
})

describe('find', function () {
  describe('when connector is unavailable', function () {
    before(function () {
      nock.cleanAll()
    })

    it('should return client unavailable', function () {
      const chargeModel = Charge('')
      return chargeModel.find(1).then(unexpectedPromise,
        function rejected (error) {
          assert.strictEqual(error.message, 'CLIENT_UNAVAILABLE')
        })
    })
  })

  describe('when connector returns incorrect response code', function () {
    before(function () {
      nock.cleanAll()

      nock(originalHost)
        .get('/v1/frontend/charges/1')
        .reply(404, '{}')
    })

    it('should return get_failed', function () {
      const chargeModel = Charge('')
      return chargeModel.find(1).then(unexpectedPromise,
        function rejected (error) {
          assert.strictEqual(error.message, 'GET_FAILED')
        })
    })
  })

  describe('when connector returns correctly', function () {
    before(function () {
      nock.cleanAll()

      nock(originalHost)
        .get('/v1/frontend/charges/1')
        .reply(200, { foo: 'bar' })
    })

    it('should return get_failed', function () {
      const chargeModel = Charge('')
      return chargeModel.find(1).then(function (data) {
        assert.strictEqual(data.foo, 'bar')
      }, unexpectedPromise)
    })
  })
})

describe('capture', function () {
  describe('when connector returns with 204 it should resolve the correct promise', function () {
    before(function () {
      nock.cleanAll()

      nock(originalHost)
        .post('/v1/frontend/charges/1/capture')
        .reply(204)
    })

    it('should return into the correct promise', function () {
      const chargeModel = Charge('')
      return chargeModel.capture(1).then(function () {
        // correct promise returned so no need to check anything
      }, unexpectedPromise)
    })
  })

  describe('when connector is unavailable', function () {
    before(function () {
      nock.cleanAll()
    })

    it('should return CLIENT_UNAVAILABLE when post fails', function () {
      const chargeModel = Charge('')
      return chargeModel.capture(1).then(unexpectedPromise,
        function rejected (error) {
          assert.strictEqual(error.message, 'CLIENT_UNAVAILABLE')
        })
    })
  })

  describe('when connector returns with auth failed should return error CAPTURE_FAILED', function () {
    before(function () {
      nock.cleanAll()

      nock(originalHost)
        .post('/v1/frontend/charges/1/capture')
        .reply(400)
    })

    it('should return AUTH_FAILED', function () {
      const chargeModel = Charge('')
      return chargeModel.capture(1).then(unexpectedPromise,
        function rejected (error) {
          assert.strictEqual(error.message, 'CAPTURE_FAILED')
        })
    })
  })

  describe('when connector returns with ! (204||400) should return error POST_FAILED', function () {
    before(function () {
      nock.cleanAll()

      nock(originalHost)
        .post('/v1/frontend/charges/1/capture')
        .reply(410)
    })

    it('should return AUTH_FAILED', function () {
      const chargeModel = Charge('')
      return chargeModel.capture(1).then(unexpectedPromise,
        function rejected (error) {
          assert.strictEqual(error.message, 'POST_FAILED')
        })
    })
  })
})

describe('findByToken', function () {
  describe('when connector is unavailable', function () {
    before(function () {
      nock.cleanAll()
    })

    it('should return client unavailable', function () {
      return expect(Charge('').findByToken(1)).to.be.rejectedWith(Error, 'CLIENT_UNAVAILABLE')
    })
  })

  describe('when connector returns incorrect response code', function () {
    before(function () {
      nock.cleanAll()

      nock(originalHost)
        .get('/v1/frontend/tokens/1')
        .reply(404, '{}')
    })

    it('should return unauthorised', function () {
      return expect(Charge('').findByToken(1)).to.be.rejectedWith(Error, 'UNAUTHORISED')
    })
  })

  describe('when connector returns correctly', function () {
    before(function () {
      nock.cleanAll()

      nock(originalHost)
        .get('/v1/frontend/tokens/1')
        .reply(200, { foo: 'bar' })
    })

    it('should return get_failed', async function () {
      const responseBody = await Charge('').findByToken(1)
      return expect(responseBody.foo).to.be.eql('bar')
    })
  })
})
