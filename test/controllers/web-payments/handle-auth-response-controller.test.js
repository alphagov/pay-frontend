'use strict'

// NPM dependencies
const { expect } = require('chai')
// NPM dependencies
const proxyquire = require('proxyquire')
const sinon = require('sinon')
const AWSXRay = require('aws-xray-sdk')
// Local dependencies
require('../../test_helpers/html_assertions')

const mockNormaliseCharge = {
  charge: object => object
}
const chargeId = 'chargeId'
const req = {
  headers: {
    'x-request-id': 'aaa'
  },
  chargeId,
  body: {},
  chargeData: {
    id: 3,
    amount: '4.99',
    gatewayAccount: {
      analyticsId: 'test-1234',
      type: 'test',
      paymentProvider: 'sandbox'
    }
  }
}

const requireHandleAuthResponseController = (mockedCharge, mockedNormaliseCharge, mockedCookies) => {
  const proxyquireMocks = {
    '../../models/charge': mockedCharge,
    '../../utils/cookies': mockedCookies,
    '../../services/normalise_charge': mockedNormaliseCharge,
    'aws-xray-sdk': {
      captureAsyncFunc: (name, callback) => {
        return callback({close: () => {}}) // eslint-disable-line
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

  return proxyquire('../../../app/controllers/web-payments/handle-auth-response-controller', proxyquireMocks)
}

describe('The web payments handle auth response controller', () => {
  it('should capture and delete connector response if connector response is in the session and status code is 200', done => {
    const mockCharge = () => {
      return {
        capture: () => {
          return {
            then: function (success) {
              return success()
            }
          }
        }
      }
    }
    const res = {
      redirect: sinon.spy(),
      render: sinon.spy(),
      status: sinon.spy()
    }
    const mockCookies = {
      getSessionVariable: () => {
        return {
          statusCode: 200
        }
      },
      deleteSessionVariable: sinon.spy()
    }
    requireHandleAuthResponseController(mockCharge, mockNormaliseCharge, mockCookies)(req, res)
    expect(mockCookies.deleteSessionVariable.calledWith(req, `ch_${chargeId}.webPaymentAuthResponse`)).to.be.ok // eslint-disable-line
    expect(res.redirect.calledWith(303, '/return/chargeId')).to.be.ok // eslint-disable-line
    done()
  })
  it('redirect to auth waiting and delete connector response if connector response is in the session and status code is 202', done => {
    const mockCharge = () => {
      return {
        capture: () => {
          return {
            then: function (success) {
              return success()
            }
          }
        }
      }
    }
    const res = {
      redirect: sinon.spy(),
      render: sinon.spy(),
      status: sinon.spy()
    }
    const mockCookies = {
      getSessionVariable: () => {
        return {
          statusCode: 202
        }
      },
      deleteSessionVariable: sinon.spy()
    }
    requireHandleAuthResponseController(mockCharge, mockNormaliseCharge, mockCookies)(req, res)
    expect(mockCookies.deleteSessionVariable.calledWith(req, `ch_${chargeId}.webPaymentAuthResponse`)).to.be.ok // eslint-disable-line
    expect(res.redirect.calledWith(303, '/card_details/chargeId/auth_waiting')).to.be.ok // eslint-disable-line
    done()
  })
  it('show capture failed page and delete connector response if connector response is in the session and and capture failed', done => {
    const mockCharge = () => {
      return {
        capture: () => {
          return {
            then: function (success, fail) {
              return fail({
                message: 'CAPTURE_FAILED'
              })
            }
          }
        }
      }
    }
    const res = {
      redirect: sinon.spy(),
      render: sinon.spy(),
      status: sinon.spy()
    }
    const mockCookies = {
      getSessionVariable: () => {
        return {
          statusCode: 200
        }
      },
      deleteSessionVariable: sinon.spy()
    }
    const systemErrorObj = {
      'viewName': 'CAPTURE_FAILURE',
      'analytics': {
        'analyticsId': 'test-1234',
        'type': 'test',
        'paymentProvider': 'sandbox',
        'path': '/handle-payment-response/3/capture_failure',
        'amount': '4.99',
        'testingVariant': 'original'
      }
    }
    requireHandleAuthResponseController(mockCharge, mockNormaliseCharge, mockCookies)(req, res)
    expect(mockCookies.deleteSessionVariable.calledWith(req, `ch_${chargeId}.webPaymentAuthResponse`)).to.be.ok // eslint-disable-line
    expect(res.render.calledWith('errors/incorrect_state/capture_failure', systemErrorObj)).to.be.true // eslint-disable-line
    done()
  })
  it('show error page and delete connector response if connector response is in the session and error', done => {
    const mockCharge = () => {
      return {
        capture: () => {
          return {
            then: function (success, fail) {
              return fail({
                message: 'some error'
              })
            }
          }
        }
      }
    }
    const res = {
      redirect: sinon.spy(),
      render: sinon.spy(),
      status: sinon.spy()
    }
    const mockCookies = {
      getSessionVariable: (req, key) => {
        // expect(key).to.be(`ch_${chargeId}.webPaymentAuthResponse`)
        return {
          statusCode: 200
        }
      },
      deleteSessionVariable: sinon.spy()
    }
    const systemErrorObj = {
      'viewName': 'SYSTEM_ERROR',
      'returnUrl': '/return/3',
      'analytics': {
        'analyticsId': 'test-1234',
        'type': 'test',
        'paymentProvider': 'sandbox',
        'path': '/handle-payment-response/3/error',
        'amount': '4.99',
        'testingVariant': 'original'
      }
    }
    requireHandleAuthResponseController(mockCharge, mockNormaliseCharge, mockCookies)(req, res)
    expect(mockCookies.deleteSessionVariable.calledWith(req, `ch_${chargeId}.webPaymentAuthResponse`)).to.be.ok // eslint-disable-line
    expect(res.render.calledWith('errors/system_error', systemErrorObj)).to.be.true // eslint-disable-line
    done()
  })
  it('show error page and delete connector response if connector response is in the session and status code is 400', done => {
    const mockCharge = () => {
      return {
        capture: () => {
          return {
            then: function (success) {
              return success()
            }
          }
        }
      }
    }
    const res = {
      redirect: sinon.spy(),
      render: sinon.spy(),
      status: sinon.spy()
    }
    const mockCookies = {
      getSessionVariable: () => {
        // expect(key).to.be(`ch_${chargeId}.webPaymentAuthResponse`)
        return {
          statusCode: 400
        }
      },
      deleteSessionVariable: sinon.spy()
    }
    const systemErrorObj = {
      'viewName': 'SYSTEM_ERROR',
      'returnUrl': '/return/3',
      'analytics': {
        'analyticsId': 'test-1234',
        'type': 'test',
        'paymentProvider': 'sandbox',
        'path': '/handle-payment-response/3/error',
        'amount': '4.99',
        'testingVariant': 'original'
      }
    }
    requireHandleAuthResponseController(mockCharge, mockNormaliseCharge, mockCookies)(req, res)
    expect(mockCookies.deleteSessionVariable.calledWith(req, `ch_${chargeId}.webPaymentAuthResponse`)).to.be.ok // eslint-disable-line
    expect(res.render.calledWith('errors/system_error', systemErrorObj)).to.be.true // eslint-disable-line
    done()
  })
  it('should return error if connector response has not been saved in the session', done => {
    const res = {
      redirect: sinon.spy(),
      render: sinon.spy(),
      status: sinon.spy()
    }
    const mockCookies = {
      getSessionVariable: sinon.spy(),
      deleteSessionVariable: sinon.spy()
    }
    const systemErrorObj = {
      'viewName': 'SYSTEM_ERROR',
      'returnUrl': '/return/3',
      'analytics': {
        'analyticsId': 'test-1234',
        'type': 'test',
        'paymentProvider': 'sandbox',
        'path': '/handle-payment-response/3/error',
        'amount': '4.99',
        'testingVariant': 'original'
      }
    }
    requireHandleAuthResponseController(() => {}, mockNormaliseCharge, mockCookies)(req, res)
      expect(res.render.calledWith('errors/system_error', systemErrorObj)).to.be.true // eslint-disable-line
      expect(mockCookies.getSessionVariable.calledWith(req, `ch_${chargeId}.webPaymentAuthResponse`)).to.be.ok // eslint-disable-line
    done()
  })
})
