'use strict'

const { expect } = require('chai')
const session = require('../../app/utils/session')

const chargeId = 'foo'

const EMPTY_RESPONSE = { params: {}, body: {}, get: () => null }

const NO_SESSION_GET_RESPONSE = {
  params: { chargeId: chargeId },
  body: {},
  method: 'GET',
  get: () => null
}

const NO_SESSION_POST_RESPONSE = {
  params: {},
  body: { chargeId: chargeId },
  method: 'POST',
  get: () => null
}

const VALID_GET_RESPONSE = {
  params: { chargeId: chargeId },
  body: {},
  method: 'GET',
  frontend_state: { ch_foo: true },
  get: () => null
}

const VALID_POST_RESPONSE = {
  params: {},
  body: { chargeId: chargeId },
  method: 'POST',
  frontend_state: { ch_foo: true },
  get: () => null
}

describe.only('session utils ', () => {
  describe.only('createChargeIdSessionKey ', () => {
    it('should return chargeId with prefix ch_', function () {
      expect(session.createChargeIdSessionKey(chargeId)).to.equal('ch_foo')
    })
  })

  describe.only('retrieve ', () => {
    it('should return session', function () {
            expect(session.retrieve(VALID_GET_RESPONSE, chargeId)).to.be.true // eslint-disable-line
    })
  })

  describe.only('validateSessionCookie ', () => {
    it('should return true for GET request with valid session cookie', function () {
            expect(session.validateSessionCookie(VALID_GET_RESPONSE)).to.be.true // eslint-disable-line
    })

    it('should return true for POST request with valid session cookie', function () {
            expect(session.validateSessionCookie(VALID_POST_RESPONSE)).to.be.true // eslint-disable-line
    })

    it('should return false if the charge param is not present in params or body', function () {
            expect(session.validateSessionCookie(EMPTY_RESPONSE)).to.be.false // eslint-disable-line
    })

    it('should return false if the charge param is in params but not in session', function () {
            expect(session.validateSessionCookie(NO_SESSION_GET_RESPONSE)).to.be.false // eslint-disable-line
    })

    it('should return false if the charge param is in THE BODY but not in session', function () {
            expect(session.validateSessionCookie(NO_SESSION_POST_RESPONSE)).to.be.false // eslint-disable-line
    })
  })
})
