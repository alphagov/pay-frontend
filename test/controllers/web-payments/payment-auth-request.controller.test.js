'use strict'

// NPM dependencies
const { expect } = require('chai')
const nock = require('nock')
const proxyquire = require('proxyquire')
const sinon = require('sinon')
const paymentFixtures = require('../../fixtures/payment.fixtures')

// Local dependencies
require('../../test-helpers/html-assertions')

const mockNormalise = object => object
const chargeId = 'chargeId'

describe('The web payments auth request controller', () => {
  describe('when processing an Apple Pay payment', () => {
    const wallet = 'apple'
    const req = {
      headers: {
        'x-request-id': 'aaa'
      },
      chargeId,
      chargeData: paymentFixtures.validChargeDetails({ paymentProvider: 'worldpay' }),
      params: {
        wallet
      },
      body: {}
    }

    const requirePaymentAuthRequestController = (mockedNormalise, mockedCookies) => {
      const proxyquireMocks = {
        '../../utils/cookies': mockedCookies,
        './apple-pay/normalise-apple-pay-payload': mockedNormalise
      }

      return proxyquire('../../../app/controllers/web-payments/payment-auth-request.controller.js', proxyquireMocks)
    }

    it('should set payload in the session and return handle payment url', done => {
      const res = {
        status: sinon.spy(),
        send: sinon.spy()
      }
      const mockCookies = {
        setSessionVariable: sinon.spy()
      }
      const expectedBodySavedInSession = {
        statusCode: 200
      }
      nock(process.env.CONNECTOR_HOST)
        .post(`/v1/frontend/charges/${chargeId}/wallets/${wallet}`)
        .reply(200)
      requirePaymentAuthRequestController(mockNormalise, mockCookies)(req, res).then(() => {
          expect(res.status.calledWith(200)).to.be.ok // eslint-disable-line
          expect(res.send.calledWith({url: `/handle-payment-response/apple/${chargeId}`})).to.be.ok // eslint-disable-line
          expect(mockCookies.setSessionVariable.calledWith(req, `ch_${chargeId}.webPaymentAuthResponse`, expectedBodySavedInSession)).to.be.ok // eslint-disable-line
        done()
      }
      )
    })

    it('should call the `next` function when the Apple Pay normalise function throws an error', done => {
      const res = {
        status: sinon.spy(),
        send: sinon.spy()
      }

      const mockCookies = () => {}
      const error = new Error('Error normalising Apple Pay payload')
      const next = sinon.spy()

      const mockNormaliseThrowException = function (object) {
        throw error
      }

      requirePaymentAuthRequestController(mockNormaliseThrowException, mockCookies)(req, res, next)
      sinon.assert.calledWith(next, error)

      done()
    })
  })

  describe('when processing a Google Pay payment', () => {
    const wallet = 'google'
    const req = {
      headers: {
        'x-request-id': 'aaa'
      },
      chargeId,
      chargeData: paymentFixtures.validChargeDetails({ paymentProvider: 'worldpay' }),
      params: {
        wallet
      },
      body: {}
    }

    const requirePaymentAuthRequestController = (mockedNormalise, mockedCookies) => {
      const proxyquireMocks = {
        '../../utils/cookies': mockedCookies,
        './google-pay/normalise-google-pay-payload': mockedNormalise
      }

      return proxyquire('../../../app/controllers/web-payments/payment-auth-request.controller.js', proxyquireMocks)
    }

    it('should set payload in the session and return handle payment url', async () => {
      const res = {
        status: sinon.spy(),
        send: sinon.spy()
      }
      const mockCookies = {
        setSessionVariable: sinon.spy()
      }
      const expectedBodySavedInSession = {
        statusCode: 200
      }
      nock(process.env.CONNECTOR_HOST)
        .post(`/v1/frontend/charges/${chargeId}/wallets/google`)
        .reply(200)

      await requirePaymentAuthRequestController(mockNormalise, mockCookies)(req, res)
      expect(res.status.calledWith(200)).to.be.ok // eslint-disable-line
      expect(res.send.calledWith({ url: `/handle-payment-response/google/${chargeId}` })).to.be.ok // eslint-disable-line
      expect(mockCookies.setSessionVariable.calledWith(req, `ch_${chargeId}.webPaymentAuthResponse`, expectedBodySavedInSession)).to.be.ok // eslint-disable-line
    })

    it('should set error identifier in the session for declined transaction, if it is present in the response body ' +
      'and return handle payment url', async () => {
      const res = {
        status: sinon.spy(),
        send: sinon.spy()
      }
      const mockCookies = {
        setSessionVariable: sinon.spy()
      }
      const expectedBodySavedInSession = {
        statusCode: 200,
        errorIdentifier: 'AUTHORISATION_REJECTED'
      }
      nock(process.env.CONNECTOR_HOST)
        .post(`/v1/frontend/charges/${chargeId}/wallets/google`)
        .reply(200, { error_identifier: 'AUTHORISATION_REJECTED' })

      await requirePaymentAuthRequestController(mockNormalise, mockCookies)(req, res)
      expect(res.status.calledWith(200)).to.be.ok // eslint-disable-line
      expect(res.send.calledWith({ url: `/handle-payment-response/google/${chargeId}` })).to.be.ok // eslint-disable-line
      expect(mockCookies.setSessionVariable.calledWith(req, `ch_${chargeId}.webPaymentAuthResponse`, expectedBodySavedInSession)).to.be.ok // eslint-disable-line
    })

    it('should not set payload in the session and return handle payment url if error', async () => {
      const res = {
        status: sinon.spy(),
        send: sinon.spy()
      }
      const mockCookies = {
        setSessionVariable: sinon.spy()
      }
      nock(process.env.CONNECTOR_HOST)
        .post(`/v1/frontend/charges/${chargeId}/wallets/apple`)
        .replyWithError('oops')

      await requirePaymentAuthRequestController(mockNormalise, mockCookies)(req, res)
      expect(res.status.calledWith(200)).to.be.ok // eslint-disable-line
      expect(res.send.calledWith({ url: `/handle-payment-response/google/${chargeId}` })).to.be.ok // eslint-disable-line
      expect(mockCookies.setSessionVariable.called).to.be.false // eslint-disable-line
    })

    it('should call the `next` function when the Google Pay normalise function throws an error', async () => {
      const res = {
        status: sinon.spy(),
        send: sinon.spy()
      }

      const mockCookies = () => {}
      const error = new Error('Error normalising Google Pay payload')
      const next = sinon.spy()

      const mockNormaliseThrowException = function (object) {
        throw error
      }

      await requirePaymentAuthRequestController(mockNormaliseThrowException, mockCookies)(req, res, next)
      sinon.assert.calledWith(next, error)
    })
  })
})
