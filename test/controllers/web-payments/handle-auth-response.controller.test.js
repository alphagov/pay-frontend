'use strict'

const proxyquire = require('proxyquire')
const sinon = require('sinon')

require('../../test-helpers/html-assertions')

const mockNormaliseCharge = {
  charge: object => object
}
const chargeId = 'chargeId'
const req = {
  headers: {
    'x-request-id': 'aaa'
  },
  chargeId,
  params: {
    wallet: 'google'
  },
  body: {},
  chargeData: {
    id: 3,
    amount: '4.99',
    paymentProvider: 'sandbox',
    gatewayAccount: {
      analyticsId: 'test-1234',
      type: 'test'
    },
    status: 'AUTHORISATION SUCCESS'
  }
}

const requireHandleAuthResponseController = (mockedCharge, mockedNormaliseCharge, mockedCookies) => {
  const proxyquireMocks = {
    '../../models/charge': mockedCharge,
    '../../utils/cookies': mockedCookies,
    '../../services/normalise-charge': mockedNormaliseCharge
  }

  return proxyquire('../../../app/controllers/web-payments/handle-auth-response.controller', proxyquireMocks)
}

describe('The web payments handle auth response controller', () => {
  let res
  beforeEach(() => {
    res = {
      redirect: sinon.spy(),
      render: sinon.spy(),
      status: sinon.spy()
    }
    req.chargeData.status = 'AUTHORISATION SUCCESS'
  })

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
    const mockCookies = {
      getSessionVariable: () => {
        return {
          statusCode: 200
        }
      },
      deleteSessionVariable: sinon.spy()
    }
    requireHandleAuthResponseController(mockCharge, mockNormaliseCharge, mockCookies)(req, res)
    sinon.assert.calledWith(mockCookies.deleteSessionVariable, req, `ch_${chargeId}.webPaymentAuthResponse`)
    sinon.assert.calledWith(res.redirect, 303, '/return/chargeId')
    done()
  })

  it('redirect to 3ds page if connector response status code is 200 and charge status is 200', done => {
    req.chargeData.status = 'AUTHORISATION 3DS REQUIRED'
    const mockCharge = () => {}
    const mockCookies = {
      getSessionVariable: () => {
        return {
          statusCode: 200
        }
      },
      deleteSessionVariable: sinon.spy()
    }
    requireHandleAuthResponseController(mockCharge, mockNormaliseCharge, mockCookies)(req, res)
    sinon.assert.calledWith(mockCookies.deleteSessionVariable, req, `ch_${chargeId}.webPaymentAuthResponse`)
    sinon.assert.calledWith(res.redirect, 303, `/card_details/${chargeId}/3ds_required`)
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
    const mockCookies = {
      getSessionVariable: () => {
        return {
          statusCode: 202
        }
      },
      deleteSessionVariable: sinon.spy()
    }
    requireHandleAuthResponseController(mockCharge, mockNormaliseCharge, mockCookies)(req, res)
    sinon.assert.calledWith(mockCookies.deleteSessionVariable, req, `ch_${chargeId}.webPaymentAuthResponse`)
    sinon.assert.calledWith(res.redirect, 303, '/card_details/chargeId/auth_waiting')
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
    const mockCookies = {
      getSessionVariable: () => {
        return {
          statusCode: 200
        }
      },
      deleteSessionVariable: sinon.spy()
    }
    const systemErrorObj = {
      viewName: 'CAPTURE_FAILURE',
      analytics: {
        analyticsId: 'test-1234',
        type: 'test',
        paymentProvider: 'sandbox',
        path: '/handle-payment-response/google/3/capture_failure',
        amount: '4.99',
        testingVariant: 'original'
      }
    }
    requireHandleAuthResponseController(mockCharge, mockNormaliseCharge, mockCookies)(req, res)
    sinon.assert.calledWith(mockCookies.deleteSessionVariable, req, `ch_${chargeId}.webPaymentAuthResponse`)
    sinon.assert.calledWith(res.render, 'errors/incorrect-state/capture-failure', systemErrorObj)
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
    const mockCookies = {
      getSessionVariable: (req, key) => {
        return {
          statusCode: 200
        }
      },
      deleteSessionVariable: sinon.spy()
    }
    const systemErrorObj = {
      viewName: 'SYSTEM_ERROR',
      returnUrl: '/return/3',
      analytics: {
        analyticsId: 'test-1234',
        type: 'test',
        paymentProvider: 'sandbox',
        path: '/handle-payment-response/google/3/error',
        amount: '4.99',
        testingVariant: 'original'
      }
    }
    requireHandleAuthResponseController(mockCharge, mockNormaliseCharge, mockCookies)(req, res)
    sinon.assert.calledWith(mockCookies.deleteSessionVariable, req, `ch_${chargeId}.webPaymentAuthResponse`)
    sinon.assert.calledWith(res.render, 'errors/system-error', systemErrorObj)
    done()
  })

  it('should show error page and delete connector response if connector response is in the session and status is 402', done => {
    const mockCharge = sinon.spy()
    const mockCookies = {
      getSessionVariable: (req, key) => {
        return {
          statusCode: 402
        }
      },
      deleteSessionVariable: sinon.spy()
    }
    const systemErrorObj = {
      viewName: 'SYSTEM_ERROR',
      returnUrl: '/return/3',
      analytics: {
        analyticsId: 'test-1234',
        type: 'test',
        paymentProvider: 'sandbox',
        path: '/handle-payment-response/google/3/error',
        amount: '4.99',
        testingVariant: 'original'
      }
    }
    requireHandleAuthResponseController(mockCharge, mockNormaliseCharge, mockCookies)(req, res)
    sinon.assert.calledWith(mockCookies.deleteSessionVariable, req, `ch_${chargeId}.webPaymentAuthResponse`)
    sinon.assert.calledWith(res.render, 'errors/system-error', systemErrorObj)
    done()
  })

  it('should render the auth_failure view and delete connector response if connector response is in the session and status code is 400 Authorisation Rejected', done => {
    const mockCharge = sinon.spy()
    const mockCookies = {
      getSessionVariable: () => {
        return {
          statusCode: 400,
          errorIdentifier: 'AUTHORISATION_REJECTED'
        }
      },
      deleteSessionVariable: sinon.spy()
    }
    const authErrorObj = {
      viewName: 'AUTHORISATION_REJECTED',
      returnUrl: '/return/3',
      analytics: {
        path: '/handle-payment-response/google/3/auth_failure',
        analyticsId: 'test-1234',
        type: 'test',
        paymentProvider: 'sandbox',
        amount: '4.99',
        testingVariant: 'original'
      }
    }

    requireHandleAuthResponseController(mockCharge, mockNormaliseCharge, mockCookies)(req, res)
    sinon.assert.calledWith(mockCookies.deleteSessionVariable, req, `ch_${chargeId}.webPaymentAuthResponse`)
    sinon.assert.calledWith(res.render, 'errors/incorrect-state/auth-failure', authErrorObj)
    done()
  })

  it('should render the error page and delete connector response if connector response is in the session ' +
    'and status code is 400, but for a Non Authorisation Rejection Error Identifier', done => {
    const mockCharge = sinon.spy()
    const mockCookies = {
      getSessionVariable: () => {
        return {
          statusCode: 400,
          errorIdentifier: 'NON_AUTHORISATION_REJECTED'
        }
      },
      deleteSessionVariable: sinon.spy()
    }
    const authErrorObj = {
      message: 'There is a problem, please try again later',
      analytics: {
        path: '/handle-payment-response/google/3',
        analyticsId: 'test-1234',
        type: 'test',
        paymentProvider: 'sandbox',
        amount: '4.99',
        testingVariant: 'original'
      },
      returnUrl: '/return/3',
      viewName: 'ERROR'
    }

    requireHandleAuthResponseController(mockCharge, mockNormaliseCharge, mockCookies)(req, res)
    sinon.assert.calledWith(mockCookies.deleteSessionVariable, req, `ch_${chargeId}.webPaymentAuthResponse`)
    sinon.assert.calledWith(res.render, 'error', authErrorObj)
    done()
  })

  it('should show error page and delete connector response if connector response is in the session and status is not recognised', done => {
    const mockCharge = sinon.spy()
    const mockCookies = {
      getSessionVariable: (req, key) => {
        return {
          statusCode: 'unknown-status-code'
        }
      },
      deleteSessionVariable: sinon.spy()
    }
    const systemErrorObj = {
      viewName: 'SYSTEM_ERROR',
      returnUrl: '/return/3',
      analytics: {
        analyticsId: 'test-1234',
        type: 'test',
        paymentProvider: 'sandbox',
        path: '/handle-payment-response/google/3/error',
        amount: '4.99',
        testingVariant: 'original'
      }
    }
    requireHandleAuthResponseController(mockCharge, mockNormaliseCharge, mockCookies)(req, res)

    sinon.assert.calledWith(mockCookies.deleteSessionVariable, req, `ch_${chargeId}.webPaymentAuthResponse`)
    sinon.assert.calledWith(res.render, 'errors/system-error', systemErrorObj)

    done()
  })

  it('should return error if connector response has not been saved in the session', done => {
    const mockCookies = {
      getSessionVariable: sinon.spy(),
      deleteSessionVariable: sinon.spy()
    }
    const systemErrorObj = {
      viewName: 'SYSTEM_ERROR',
      returnUrl: '/return/3',
      analytics: {
        analyticsId: 'test-1234',
        type: 'test',
        paymentProvider: 'sandbox',
        path: '/handle-payment-response/google/3/error',
        amount: '4.99',
        testingVariant: 'original'
      }
    }
    requireHandleAuthResponseController(() => { }, mockNormaliseCharge, mockCookies)(req, res)
    sinon.assert.calledWith(res.render, 'errors/system-error', systemErrorObj)
    sinon.assert.calledWith(mockCookies.getSessionVariable, req, `ch_${chargeId}.webPaymentAuthResponse`)
    done()
  })
})
