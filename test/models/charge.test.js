'use strict'

// NPM dependencies
const assert = require('assert')
const nock = require('nock')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai

// Local dependencies
require('../test-helpers/html-assertions.js')
const Charge = require('../../app/models/charge.js')
const { unexpectedPromise } = require('../test-helpers/test-helpers.js')

// Constants
const originalHost = process.env.CONNECTOR_HOST

describe.only('updateStatus', function () {
  describe.only('when connector is unavailable', function () {
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

  describe.only('when connector returns wrong response', function () {
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

  describe.only('it returns everything correctly', function () {
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

describe.only('find', function () {
  describe.only('when connector is unavailable', function () {
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

  describe.only('when connector returns incorrect response code', function () {
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

  describe.only('when connector returns correctly', function () {
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

describe.only('capture', function () {
  describe.only('when connector returns with 204 it should resolve the correct promise', function () {
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

  describe.only('when connector is unavailable', function () {
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

  describe.only('when connector returns with auth failed should return error CAPTURE_FAILED', function () {
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

  describe.only('when connector returns with ! (204||400) should return error POST_FAILED', function () {
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

describe.only('findByToken', function () {
  describe.only('when connector is unavailable', function () {
    before(function () {
      nock.cleanAll()
    })

    it('should return client unavailable', function () {
      return expect(Charge('').findByToken(1)).to.be.rejectedWith(Error, 'CLIENT_UNAVAILABLE')
    })
  })

  describe.only('when connector returns incorrect response code', function () {
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

  describe.only('when connector returns correctly', function () {
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
