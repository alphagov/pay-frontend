'use strict'

const proxyquire = require('proxyquire')
const sinon = require('sinon')
const expect = require('chai').expect

const paths = require('../../app/paths.js')
const withAnalyticsError = require('../../app/utils/analytics').withAnalyticsError
const { validTokenResponse } = require('../fixtures/payment.fixtures')

require('../test-helpers/html-assertions.js')

const chargeId = 'dh6kpbb4k82oiibbe4b9haujjk'

const findByTokenFailureStub = () => Promise.reject(new Error('UNAUTHORISED'))

function getFindByTokenSuccessStub (used, chargeStatus) {
  return () => Promise.resolve(validTokenResponse({
    used,
    chargeId,
    status: chargeStatus
  }))
}

const requireSecureController = function (findByTokenStub, markTokenAsUsedSuccessful, mockedResponseRouter) {
  const markTokenAsUsedStub = markTokenAsUsedSuccessful ? () => Promise.resolve() : () => Promise.reject(new Error('err'))

  return proxyquire('../../app/controllers/secure.controller.js', {
    '../utils/response-router': mockedResponseRouter,
    '../models/charge.js': () => ({
      findByToken: findByTokenStub
    }),
    '../models/token.js': {
      markTokenAsUsed: markTokenAsUsedStub
    },
    csrf: () => ({
      secretSync: () => 'foo'
    })
  })
}

describe('secure controller', function () {
  describe('get method', function () {
    let request
    let response
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

      responseRouter = {
        response: sinon.spy(),
        systemErrorResponse: sinon.spy()
      }
    })

    describe('when the token is invalid', function () {
      it('should display the "Your payment session has expired" page', async function () {
        await requireSecureController(findByTokenFailureStub, true, responseRouter).new(request, response)
        expect(responseRouter.response.calledWith(request, response, 'UNAUTHORISED')).to.be.true // eslint-disable-line
      })
    })

    describe('when the token is valid', function () {
      describe('and not marked as used successfully', function () {
        it('should display the generic error page', async function () {
          await requireSecureController(getFindByTokenSuccessStub(false, 'CREATED'), false, responseRouter).new(request, response)
          expect(responseRouter.systemErrorResponse.calledWith(request, response, 'Error exchanging payment token', withAnalyticsError())).to.be.true // eslint-disable-line
        })
      })

      describe('and the token is marked as used successfully', function () {
        it('should store the service name into the session and redirect', async function () {
          await requireSecureController(getFindByTokenSuccessStub(false, 'CREATED'), true, responseRouter).new(request, response)
          expect(response.redirect.calledWith(303, paths.generateRoute('card.new', {chargeId: chargeId}))).to.be.true // eslint-disable-line
          expect(request.frontend_state).to.have.all.keys('ch_' + chargeId)
          expect(request.frontend_state.ch_dh6kpbb4k82oiibbe4b9haujjk).to.eql({
            csrfSecret: 'foo' // pragma: allowlist secret
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
          await requireSecureController(getFindByTokenSuccessStub(true, 'CREATED'), true, responseRouter).new(requestWithEmptyCookie, response)
          expect(responseRouter.response.calledWith(requestWithEmptyCookie, response, 'UNAUTHORISED')).to.be.true // eslint-disable-line
        })
      })

      describe('and the token has been used and the frontend state cookie is not present', function () {
        it('should display the "Your payment session has expired" page', async function () {
          const requestWithoutCookie = {
            params: { chargeTokenId: 1 },
            headers: { 'x-Request-id': 'unique-id' }
          }
          await requireSecureController(getFindByTokenSuccessStub(true, 'CREATED'), true, responseRouter).new(requestWithoutCookie, response)
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
          await requireSecureController(getFindByTokenSuccessStub(true, 'CREATED'), true, responseRouter).new(requestWithWrongCookie, response)
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

          await requireSecureController(getFindByTokenSuccessStub(true, 'AUTHORISATION_SUCCESS'), true, responseRouter).new(requestWithFrontendStateCookie, response)
          const opts = {
            chargeId: 'dh6kpbb4k82oiibbe4b9haujjk',
            returnUrl: '/return/dh6kpbb4k82oiibbe4b9haujjk'
          }
          expect(responseRouter.response.calledWith(requestWithFrontendStateCookie, response, 'AUTHORISATION_SUCCESS', opts)).to.be.true // eslint-disable-line
          expect(requestWithFrontendStateCookie.frontend_state).to.have.all.keys('ch_' + chargeId)
          expect(requestWithFrontendStateCookie.frontend_state.ch_dh6kpbb4k82oiibbe4b9haujjk).to.eql({
            csrfSecret: 'foo' // pragma: allowlist secret
          })
        })
      })
    })
  })
})
