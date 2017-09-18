var path = require('path')
require(path.join(__dirname, '/../test_helpers/html_assertions.js'))
var proxyquire = require('proxyquire')
var sinon = require('sinon')
var expect = require('chai').expect
var paths = require('../../app/paths.js')

var mockCharge = (function () {
  var mock = function (withSuccess, chargeObject) {
    return function () {
      return {
        findByToken: function () {
          return new Promise(function (resolve, reject) {
            (withSuccess) ? resolve(chargeObject) : reject(new Error())
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

var mockToken = (function () {
  var mock = function (withSuccess) {
    return function () {
      return {
        destroy: function () {
          return new Promise(function (resolve, reject) {
            (withSuccess) ? resolve() : reject(new Error())
          })
        }
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

var requireSecureController = function (mockedCharge, mockedToken) {
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
    var request, response, chargeObject

    before(function () {
      request = {
        frontend_state: {},
        params: {chargeTokenId: 1},
        headers: {'x-Request-id': 'unique-id'}
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
          var systemErrorObj = {
            viewName: 'SYSTEM_ERROR',
            analytics: {
              'analyticsId': 'Service unavailable',
              'type': 'Service unavailable',
              'paymentProvider': 'Service unavailable'
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
          var systemErrorObj = {
            viewName: 'SYSTEM_ERROR',
            analytics: {
              'analyticsId': 'Service unavailable',
              'type': 'Service unavailable',
              'paymentProvider': 'Service unavailable'
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
