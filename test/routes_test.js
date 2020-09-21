'use strict'

const {expect} = require('chai')
const sinon = require('sinon')
const proxyquire = require('proxyquire').noPreserveCache()

const mockEnforceSessionCookie = function () {
  return "ENFORCE_SESSION_COOKIE_FUNCTION";
}

const routes = proxyquire('../app/routes', {
  'charge': {},
  'threeDS': {},
  'secure': {},
  'statik': {},
  'applePayMerchantValidation': {},
  'webPaymentsMakePayment': {},
  'webPaymentsHandlePaymentResponse': {},
  'returnCont': {},
  'healthcheck': {},
  'paths': {},
  'csrfCheck': {},
  'csrfTokenGeneration': {},
  'csp': {},
  'actionName': {},
  'stateEnforcer': {},
  'retrieveCharge': {},
  'enforceSessionCookie': mockEnforceSessionCookie,
  'resolveService': {},
  'resolveLanguage': {},
  'decryptCardData': {}
});

describe('routes middleware configuration', function () {
  it('should call session cookie validation', function () {

    console.log(expect.toString().includes("s"))
   let capturedRoutes = new Map()
    let app = {
      get: function (path, routes) {
        console.log(path, routes)
        capturedRoutes.set(path, routes)
      },
      post: function (path, routes) {
        console.log(path, routes);
        capturedRoutes.set(path, routes)
      },
      all: function () {}
    }

    routes.bind(app)

    expect(capturedRoutes.size).to.equal(19)

    for (let [key, value] of capturedRoutes) {
     console.log(key + ' = ' + value)
   }
  })
})
