'use strict'

const proxyquire = require('proxyquire')
const sinon = require('sinon')
const expect = require('chai').expect

const paths = require('../../app/paths.js')
const withAnalyticsError = require('../../app/utils/analytics').withAnalyticsError
const { validChargeDetails } = require('../fixtures/payment.fixtures')

require('../test-helpers/html-assertions.js')

const chargeId = 'ch_dh6kpbb4k82oiibbe4b9haujjk'

const mockCharge = (function () {
  const mock = function (withSuccess, chargeObject) {
    return function () {
      return {
        findByToken: function () {
          return new Promise(function (resolve, reject) {
            if (withSuccess) {
              resolve(chargeObject)
            } else {
              reject(new Error('UNAUTHORISED'))
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
      markTokenAsUsed: function () {
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

const requireSecureController = function (mockedCharge, mockedToken, mockedResponseRouter) {
  return proxyquire('../../app/controllers/secure.controller.js', {
    '../utils/response-router': mockedResponseRouter,
    '../models/charge.js': mockedCharge,
    '../models/token.js': mockedToken,
    csrf: function () {
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
    let responseRouter

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
        used: false,
        charge: {
          externalId: 'dh6kpbb4k82oiibbe4b9haujjk',
          status: 'CREATED',
          gatewayAccount: {
            service_name: 'Service Name',
            analytics_id: 'bla-1234',
            type: 'live'
          },
          payment_provider: 'worldpay'
        }
      }

      responseRouter = {
        response: sinon.spy(),
        systemErrorResponse: sinon.spy()
      }
    })

    describe('when the token is invalid', function () {
      it('should display the "Your payment session has expired" page', async function () {
        await requireSecureController(mockCharge.withFailure(), mockToken.withSuccess(), responseRouter).new(request, response)
        expect(responseRouter.response.calledWith(request, response, 'UNAUTHORISED')).to.be.true // eslint-disable-line
      })
    })

    describe('when the token is valid', function () {
      describe('and not marked as used successfully', function () {
        it('should display the generic error page', async function () {
          await requireSecureController(mockCharge.withSuccess(), mockToken.withFailure(), responseRouter).new(request, response)
          expect(responseRouter.systemErrorResponse.calledWith(request, response, 'Error exchanging payment token', withAnalyticsError())).to.be.true // eslint-disable-line
        })
      })

      describe('when the token is used successfully', function () {
        describe('old connector token response', () => {
          it('should store the service name into the session and redirect', async function () {
            await requireSecureController(mockCharge.withSuccess(chargeObject), mockToken.withSuccess(), responseRouter).new(request, response)
            expect(response.redirect.calledWith(303, paths.generateRoute('card.new', {chargeId: chargeObject.charge.externalId}))).to.be.true // eslint-disable-line
            expect(request.frontend_state).to.have.all.keys(chargeId)
            expect(request.frontend_state.ch_dh6kpbb4k82oiibbe4b9haujjk).to.eql({
              csrfSecret: 'foo' // pragma: allowlist secret
            })
          })
        })

        describe('new connector token response', () => {
          it('should store the service name into the session and redirect', async function () {
            const newChargeObject = validChargeDetails({ chargeId })
            await requireSecureController(mockCharge.withSuccess(newChargeObject), mockToken.withSuccess(), responseRouter).new(request, response)
            expect(response.redirect.calledWith(303, paths.generateRoute('card.new', {chargeId: chargeObject.charge.externalId}))).to.be.true // eslint-disable-line
            expect(request.frontend_state).to.have.all.keys(chargeId)
            expect(request.frontend_state.ch_dh6kpbb4k82oiibbe4b9haujjk).to.eql({
              csrfSecret: 'foo' // pragma: allowlist secret
            })
          })
        })
      })

      describe('and the token has been used and the frontend state cookie is empty', function () {
        it('should display the "Your payment session has expired" page', async function () {
          const requestWithEmptyCookie = {
            frontend_state: {},
            params: { chargeTokenId: 1 },
            headers: { 'x-Request-id': 'unique-id' }
          }
          const charge = {
            used: true,
            charge: {
              externalId: 'dh6kpbb4k82oiibbe4b9haujjk',
              status: 'AUTHORISATION SUCCESS',
              gatewayAccount: {
                service_name: 'Service Name',
                analytics_id: 'bla-1234',
                type: 'live'
              },
              payment_provider: 'worldpay'
            }
          }
          await requireSecureController(mockCharge.withSuccess(charge), mockToken.withSuccess(), responseRouter).new(requestWithEmptyCookie, response)
          expect(responseRouter.response.calledWith(requestWithEmptyCookie, response, 'UNAUTHORISED')).to.be.true // eslint-disable-line
        })
      })

      describe('and the token has been used and the frontend state cookie is not present', function () {
        it('should display the "Your payment session has expired" page', async function () {
          const requestWithoutCookie = {
            params: { chargeTokenId: 1 },
            headers: { 'x-Request-id': 'unique-id' }
          }
          const charge = {
            used: true,
            charge: {
              externalId: 'dh6kpbb4k82oiibbe4b9haujjk',
              status: 'AUTHORISATION SUCCESS',
              gatewayAccount: {
                service_name: 'Service Name',
                analytics_id: 'bla-1234',
                type: 'live'
              },
              payment_provider: 'worldpay'
            }
          }
          await requireSecureController(mockCharge.withSuccess(charge), mockToken.withSuccess(), responseRouter).new(requestWithoutCookie, response)
          expect(responseRouter.response.calledWith(requestWithoutCookie, response, 'UNAUTHORISED')).to.be.true // eslint-disable-line
        })
      })

      describe('and the token has been used and the frontend state cookie has the wrong value', function () {
        it('should display the "Your payment session has expired" page', async function () {
          const requestWithWrongCookie = {
            frontend_state: {
              ch_xxxx: {
                csrfSecret: 'foo' // pragma: allowlist secret
              }
            },
            params: { chargeTokenId: 1 },
            headers: { 'x-Request-id': 'unique-id' }
          }
          const charge = {
            used: true,
            charge: {
              externalId: 'dh6kpbb4k82oiibbe4b9haujjk',
              status: 'AUTHORISATION SUCCESS',
              gatewayAccount: {
                service_name: 'Service Name',
                analytics_id: 'bla-1234',
                type: 'live'
              },
              payment_provider: 'worldpay'
            }
          }
          await requireSecureController(mockCharge.withSuccess(charge), mockToken.withSuccess(), responseRouter).new(requestWithWrongCookie, response)
          expect(responseRouter.response.calledWith(requestWithWrongCookie, response, 'UNAUTHORISED')).to.be.true // eslint-disable-line
        })
      })

      describe('and the token has been used and the frontend state cookie contains the ID of the payment associated with the token', function () {
        it('should redirect to the appropriate page based on the charge state', async function () {
          const requestWithFrontendStateCookie = {
            frontend_state: {
              ch_dh6kpbb4k82oiibbe4b9haujjk: {
                csrfSecret: 'foo' // pragma: allowlist secret
              }
            },
            params: { chargeTokenId: 1 },
            headers: { 'x-Request-id': 'unique-id' }
          }
          const charge = {
            used: true,
            charge: {
              externalId: 'dh6kpbb4k82oiibbe4b9haujjk',
              status: 'AUTHORISATION SUCCESS',
              gatewayAccount: {
                service_name: 'Service Name',
                analytics_id: 'bla-1234',
                type: 'live'
              },
              payment_provider: 'worldpay'
            }
          }
          await requireSecureController(mockCharge.withSuccess(charge), mockToken.withSuccess(), responseRouter).new(requestWithFrontendStateCookie, response)
          const opts = {
            chargeId: 'dh6kpbb4k82oiibbe4b9haujjk',
            returnUrl: '/return/dh6kpbb4k82oiibbe4b9haujjk'
          }
          expect(responseRouter.response.calledWith(requestWithFrontendStateCookie, response, 'AUTHORISATION_SUCCESS', opts)).to.be.true // eslint-disable-line
          expect(requestWithFrontendStateCookie.frontend_state).to.have.all.keys(chargeId)
          expect(requestWithFrontendStateCookie.frontend_state.ch_dh6kpbb4k82oiibbe4b9haujjk).to.eql({
            csrfSecret: 'foo' // pragma: allowlist secret
          })
        })
      })
    })
  })
})
