'use strict'

// Core dependencies
const path = require('path')

// NPM dependencies
const proxyquire = require('proxyquire')
const sinon = require('sinon')
const expect = require('chai').expect

// Local dependencies
const paths = require('../../app/paths.js')

// configure
require(path.join(__dirname, '/../test_helpers/html_assertions.js'))

const mockCharge = (function () {
  const mock = function (withSuccess, chargeObject) {
    return function () {
      return {
        findByToken: function () {
          return new Promise(function (resolve, reject) {
            if (withSuccess) {
              resolve(chargeObject)
            } else {
              reject(new Error('err'))
            }
          })
        }
      }
    }
  }

  return {
    withSuccess: function (chargeObject) {
      return mock(true, chargeObject)
    },
    withFailure: function () {
      return mock(false)
    }
  }
}())

const mockToken = (function () {
  const mock = function (withSuccess) {
    return {
      destroy: function () {
        return new Promise(function (resolve, reject) {
          if (withSuccess) {
            resolve()
          } else {
            reject(new Error('err'))
          }
        })
      }
    }
  }

  return {
    withSuccess: function () {
      return mock(true)
    },
    withFailure: function () {
      return mock(false)
    }
  }
}())

const requireSecureController = function (mockedCharge, mockedToken) {
  return proxyquire(path.join(__dirname, '/../../app/controllers/secure_controller.js'), {
    '../models/charge.js': mockedCharge,
    '../models/token.js': mockedToken,
    'csrf': function () {
      return {
        secretSync: function () {
          return 'foo'
        }
      }
    }
  })
}

describe('secure controller', function () {
  describe('get method', function () {
    let request
    let response
    let chargeObject

    before(function () {
      request = {
        frontend_state: {},
        params: { chargeTokenId: 1 },
        headers: { 'x-Request-id': 'unique-id' }
      }

      response = {
        redirect: sinon.spy(),
        render: sinon.spy(),
        status: sinon.spy()
      }

      chargeObject = {
        'externalId': 'dh6kpbb4k82oiibbe4b9haujjk',
        'status': 'CREATED',
        'gatewayAccount': {
          'service_name': 'Service Name',
          'analytics_id': 'bla-1234',
          'type': 'live',
          'payment_provider': 'worldpay'
        }
      }
    })

    describe('when the token is invalid', function () {
      it('should display the generic error page', function (done) {
        requireSecureController(mockCharge.withFailure(), mockToken.withSuccess()).new(request, response)
        setTimeout(function () {
          const systemErrorObj = {
            viewName: 'SYSTEM_ERROR',
            analytics: {
              'analyticsId': 'Service unavailable',
              'type': 'Service unavailable',
              'paymentProvider': 'Service unavailable',
              'amount': '0.00'
            }
          }
          expect(response.render.calledWith('errors/system_error', systemErrorObj)).to.be.true // eslint-disable-line
          done()
        }, 0)
      })
    })

    describe('when the token is valid', function () {
      describe('and not destroyed successfully', function () {
        it('should display the generic error page', function () {
          requireSecureController(mockCharge.withSuccess(), mockToken.withFailure()).new(request, response)
          const systemErrorObj = {
            viewName: 'SYSTEM_ERROR',
            analytics: {
              'analyticsId': 'Service unavailable',
              'type': 'Service unavailable',
              'paymentProvider': 'Service unavailable',
              'amount': '0.00'
            }
          }
          expect(response.render.calledWith('errors/system_error', systemErrorObj)).to.be.true // eslint-disable-line
        })
      })

      describe('then destroyed successfully', function () {
        it('should store the service name into the session and redirect', function (done) {
          requireSecureController(mockCharge.withSuccess(chargeObject), mockToken.withSuccess()).new(request, response)
          setTimeout(function () {
            expect(response.redirect.calledWith(303, paths.generateRoute('card.new', {chargeId: chargeObject.externalId}))).to.be.true // eslint-disable-line
            expect(request.frontend_state).to.have.all.keys('ch_dh6kpbb4k82oiibbe4b9haujjk')
            expect(request.frontend_state['ch_dh6kpbb4k82oiibbe4b9haujjk']).to.eql({
              'csrfSecret': 'foo'
            })
            done()
          }, 0)
        })
      })
    })
  })
})
