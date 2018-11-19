'use strict'

// NPM dependencies
const path = require('path')
const assert = require('assert')
const nock = require('nock')
const {unexpectedPromise} = require(path.join(__dirname, '/../test_helpers/test_helpers.js'))
const proxyquire = require('proxyquire')
const AWSXRay = require('aws-xray-sdk')

// Local dependencies
require(path.join(__dirname, '/../test_helpers/html_assertions.js'))

const CardModel = proxyquire(path.join(__dirname, '/../../app/models/card.js'), {
  'aws-xray-sdk': {
    captureAsyncFunc: function (name, callback) {
      callback(new AWSXRay.Segment('stub-subsegment'))
    }
  },
  'continuation-local-storage': {
    getNamespace: function () {
      return {
        get: function () {
          return new AWSXRay.Segment('stub-segment')
        }
      }
    }
  }
})

// Constants
const aRequestId = 'unique-request-id'
const aCorrelationHeader = {
  reqheaders: {
    'x-request-id': aRequestId
  }
}

describe('card', function () {
  describe('check card', function () {
    describe('when card is not found', function () {
      before(function () {
        nock.cleanAll()
        nock(process.env.CARDID_HOST)
          .post('/v1/api/card')
          .reply(404)
      })

      it('should return the correct message', function () {
        return CardModel({}, aRequestId).checkCard(1234).then(unexpectedPromise, function (error) {
          assert.strictEqual(error.message, 'Your card is not supported')
        })
      })
    })

    describe('when an unexpected response code', function () {
      before(function () {
        nock.cleanAll()

        nock(process.env.CARDID_HOST, aCorrelationHeader)
          .post('/v1/api/card')
          .reply(201)
      })

      it('should resolve', function () {
        return CardModel({}, aRequestId).checkCard(1234).then(() => {}, unexpectedPromise)
      })
    })

    describe('an unknown card', function () {
      before(function () {
        nock.cleanAll()

        nock(process.env.CARDID_HOST)
          .post('/v1/api/card')
          .reply(201)
      })

      it('should resolve', function () {
        return CardModel().checkCard(1234).then(() => {}, unexpectedPromise)
      })
    })

    describe('a card that is not allowed', function () {
      before(function () {
        nock.cleanAll()
        nock(process.env.CARDID_HOST)
          .post('/v1/api/card')
          .reply(200, {brand: 'bar', label: 'bar', corporate: false})
      })

      it('should reject with appropriate message', function () {
        return CardModel([{brand: 'foo', label: 'foo', type: 'CREDIT', id: 'id-0'}])
          .checkCard(1234).then(unexpectedPromise, function (error) {
            assert.strictEqual(error.message, 'Bar is not supported')
          })
      })
    })

    describe('a card that is not allowed debit withdrawal type', function () {
      before(function () {
        nock.cleanAll()
        nock(process.env.CARDID_HOST)
          .post('/v1/api/card')
          .reply(200, {brand: 'bar', label: 'bar', type: 'D', corporate: false})
      })

      it('should reject with appropriate message', function () {
        return CardModel([{brand: 'bar', label: 'bar', type: 'CREDIT', id: 'id-0'}], aRequestId)
          .checkCard(1234).then(unexpectedPromise, function (error) {
            assert.strictEqual(error.message, 'Bar debit cards are not supported')
          })
      })
    })

    describe('a card that is not allowed credit withdrawal type', function () {
      before(function () {
        nock.cleanAll()
        nock(process.env.CARDID_HOST)
          .post('/v1/api/card')
          .reply(200, {brand: 'bar', label: 'bar', type: 'C', corporate: false})
      })

      it('should reject with appropriate message', function () {
        return CardModel([{brand: 'bar', label: 'bar', type: 'DEBIT', id: 'id-0'}])
          .checkCard(1234).then(unexpectedPromise, function (error) {
            assert.strictEqual(error.message, 'Bar credit cards are not supported')
          })
      })
    })

    describe('a corporate credit card that is allowed', function () {
      before(function () {
        nock.cleanAll()
        nock(process.env.CARDID_HOST)
          .post('/v1/api/card')
          .reply(200, {brand: 'bar', label: 'bar', type: 'C', corporate: true})
      })

      it('should resolve with correct card brand, type and corporate status', function () {
        return CardModel([{brand: 'bar', label: 'bar', type: 'CREDIT', id: 'id-0'}])
          .checkCard(1234).then((card) => {
            assert.strictEqual(card.brand, 'bar')
            assert.strictEqual(card.type, 'CREDIT')
            assert.strictEqual(card.corporate, true)
          }, unexpectedPromise)
      })
    })

    describe('a non corporate debit card that is allowed', function () {
      before(function () {
        nock.cleanAll()
        nock(process.env.CARDID_HOST)
          .post('/v1/api/card')
          .reply(200, {brand: 'bar', label: 'bar', type: 'D', corporate: false})
      })

      it('should resolve with correct card brand, type and corporate status', function () {
        return CardModel([{brand: 'bar', label: 'bar', type: 'DEBIT', id: 'id-0'}])
          .checkCard(1234).then((card) => {
            assert.strictEqual(card.brand, 'bar')
            assert.strictEqual(card.type, 'DEBIT')
            assert.strictEqual(card.corporate, false)
          }, unexpectedPromise)
      })
    })

    describe('a card that is allowed but of CD type', function () {
      before(function () {
        nock.cleanAll()
        nock(process.env.CARDID_HOST)
          .post('/v1/api/card')
          .reply(200, {brand: 'bar', label: 'bar', type: 'CD', corporate: false})
      })

      it('should resolve with correct card brand', function () {
        return CardModel([{brand: 'bar', label: 'bar', type: 'CREDIT', id: 'id-0'}])
          .checkCard(1234).then((card) => {
            assert.strictEqual(card.brand, 'bar')
            assert.strictEqual(card.type, 'CREDIT_OR_DEBIT')
            assert.strictEqual(card.corporate, false)
          }, unexpectedPromise)
      })
    })

    describe('a card that is allowed but of unknown type', function () {
      before(function () {
        nock.cleanAll()
        nock(process.env.CARDID_HOST)
          .post('/v1/api/card')
          .reply(200, {brand: 'bar', label: 'bar', type: 'unknown', corporate: false})
      })

      it('should resolve with correct card brand', function () {
        return CardModel([{brand: 'bar', label: 'bar', type: 'CREDIT', id: 'id-0'}])
          .checkCard(1234).then((card) => {
            assert.strictEqual(card.brand, 'bar')
            assert.strictEqual(card.type, undefined)
            assert.strictEqual(card.corporate, false)
          }, unexpectedPromise)
      })
    })
  })

  describe('allowedCards', function () {
    it('should return the passed in cards', function () {
      const cards = [{brand: 'foo', debit: true}]
      const Card = CardModel(cards)
      const CardCopy = CardModel(cards)
      assert.deepStrictEqual(Card.allowed, cards)
      // should return a copy
      assert.notStrictEqual(Card.allowed, cards)
      assert.notStrictEqual(Card.allowed, CardCopy.allowed)
    })

    it('should return the passed in cards withdrawal types', function () {
      const debitOnly = CardModel([{brand: 'foo', debit: true}])
      const creditOnly = CardModel([{brand: 'foo', credit: true}])
      const both = CardModel([{brand: 'foo', credit: true, debit: true}])

      assert.deepStrictEqual(debitOnly.withdrawalTypes, ['debit'])
      assert.deepStrictEqual(creditOnly.withdrawalTypes, ['credit'])
      assert.deepStrictEqual(both.withdrawalTypes, ['debit', 'credit'])
    })
  })

  describe('withdrawalTypes', function () {
    it('should return the passed in cards withdrawal types', function () {
      const debitOnly = CardModel([{brand: 'foo', debit: true}])
      const creditOnly = CardModel([{brand: 'foo', credit: true}])
      const both = CardModel([{brand: 'foo', credit: true, debit: true}])

      assert.deepStrictEqual(debitOnly.withdrawalTypes, ['debit'])
      assert.deepStrictEqual(creditOnly.withdrawalTypes, ['credit'])
      assert.deepStrictEqual(both.withdrawalTypes, ['debit', 'credit'])
    })
  })
})
