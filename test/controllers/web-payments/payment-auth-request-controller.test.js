'use strict'

// NPM dependencies
const { expect } = require('chai')
const nock = require('nock')
const proxyquire = require('proxyquire')
const sinon = require('sinon')
const AWSXRay = require('aws-xray-sdk')

// Local dependencies
require('../../test_helpers/html_assertions')

const mockNormalise = object => object
const chargeId = 'chargeId'

describe('The web payments auth request controller', () => {
  describe('when processing an Apple Pay payment', () => {
    const provider = 'apple'
    const req = {
      headers: {
        'x-request-id': 'aaa'
      },
      chargeId,
      params: {
        provider
      },
      body: {}
    }

    const requirePaymentAuthRequestController = (mockedNormalise, mockedCookies) => {
      const proxyquireMocks = {
        '../../utils/cookies': mockedCookies,
        './apple-pay/normalise-apple-pay-payload': mockedNormalise,
        'aws-xray-sdk': {
          captureAsyncFunc: (name, callback) => {
            return callback({ close: () => { } }) // eslint-disable-line
          }
        },
        'continuation-local-storage': {
          getNamespace: () => {
            return {
              get: function () {
                return new AWSXRay.Segment('stub-segment')
              }
            }
          }
        }
      }

      return proxyquire('../../../app/controllers/web-payments/payment-auth-request-controller.js', proxyquireMocks)
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
        .post(`/v1/frontend/charges/${chargeId}/wallets/${provider}`)
        .reply(200)
      requirePaymentAuthRequestController(mockNormalise, mockCookies)(req, res).then(() => {
          expect(res.status.calledWith(200)).to.be.ok // eslint-disable-line
          expect(res.send.calledWith({url: `/handle-payment-response/${chargeId}`})).to.be.ok // eslint-disable-line
          expect(mockCookies.setSessionVariable.calledWith(req, `ch_${chargeId}.webPaymentAuthResponse`, expectedBodySavedInSession)).to.be.ok // eslint-disable-line
        done()
      }
      )
    })

    it('should not set payload in the session and return handle payment url if error', done => {
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
      requirePaymentAuthRequestController(mockNormalise, mockCookies)(req, res).then(() => {
          expect(res.status.calledWith(200)).to.be.ok // eslint-disable-line
          expect(res.send.calledWith({url: `/handle-payment-response/${chargeId}`})).to.be.ok // eslint-disable-line
          expect(mockCookies.setSessionVariable.called).to.be.false // eslint-disable-line
        done()
      }
      )
    })
  })

  describe('when processing a Google Pay payment', () => {
    const provider = 'google'
    const req = {
      headers: {
        'x-request-id': 'aaa'
      },
      chargeId,
      params: {
        provider
      },
      body: {}
    }

    const requirePaymentAuthRequestController = (mockedNormalise, mockedCookies) => {
      const proxyquireMocks = {
        '../../utils/cookies': mockedCookies,
        './google-pay/normalise-google-pay-payload': mockedNormalise,
        'aws-xray-sdk': {
          captureAsyncFunc: (name, callback) => {
            return callback({ close: () => { } }) // eslint-disable-line
          }
        },
        'continuation-local-storage': {
          getNamespace: () => {
            return {
              get: function () {
                return new AWSXRay.Segment('stub-segment')
              }
            }
          }
        }
      }

      return proxyquire('../../../app/controllers/web-payments/payment-auth-request-controller.js', proxyquireMocks)
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
        .post(`/v1/frontend/charges/${chargeId}/wallets/${provider}`)
        .reply(200)
      requirePaymentAuthRequestController(mockNormalise, mockCookies)(req, res).then(() => {
        expect(res.status.calledWith(200)).to.be.ok // eslint-disable-line
        expect(res.send.calledWith({ url: `/handle-payment-response/${chargeId}` })).to.be.ok // eslint-disable-line
        expect(mockCookies.setSessionVariable.calledWith(req, `ch_${chargeId}.webPaymentAuthResponse`, expectedBodySavedInSession)).to.be.ok // eslint-disable-line
        done()
      }
      )
    })

    it('should not set payload in the session and return handle payment url if error', done => {
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
      requirePaymentAuthRequestController(mockNormalise, mockCookies)(req, res).then(() => {
        expect(res.status.calledWith(200)).to.be.ok // eslint-disable-line
        expect(res.send.calledWith({ url: `/handle-payment-response/${chargeId}` })).to.be.ok // eslint-disable-line
        expect(mockCookies.setSessionVariable.called).to.be.false // eslint-disable-line
        done()
      }
      )
    })
  })
})
