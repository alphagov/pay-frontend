'use strict'

// Local dependencies
const charge = require('./controllers/charge.controller.js')
const threeDS = require('./controllers/three-d-secure.controller.js')
const secure = require('./controllers/secure.controller.js')
const statik = require('./controllers/static.controller.js')
const applePayMerchantValidation = require('./controllers/web-payments/apple-pay/merchant-validation.controller')
const webPaymentsMakePayment = require('./controllers/web-payments/payment-auth-request.controller')
const webPaymentsHandlePaymentResponse = require('./controllers/web-payments/handle-auth-response.controller')
const returnCont = require('./controllers/return.controller.js')
const { healthcheck } = require('./controllers/healthcheck.controller.js')
const paths = require('./paths.js')

// Express middleware
const { csrfCheck, csrfTokenGeneration } = require('./middleware/csrf.js')
const csp = require('./middleware/csp')
const actionName = require('./middleware/action-name.js')
const stateEnforcer = require('./middleware/state-enforcer.js')
const retrieveCharge = require('./middleware/retrieve-charge.js')
const enforceSessionCookie = require('./middleware/enforce-session-cookie.js')
const resolveService = require('./middleware/resolve-service.js')
const resolveLanguage = require('./middleware/resolve-language.js')
const decryptCardData = require('./middleware/decrypt-card-data')(process.env)

// Import AB test when we need to use it
// const abTest = require('./utils/ab-test.js')
// const AB_TEST_THRESHOLD = process.env.AB_TEST_THRESHOLD

exports.paths = paths

exports.bind = function (app) {
  app.get('/healthcheck', healthcheck)

  // charges
  const card = paths.card

  const standardMiddlewareStack = [
    csrfCheck,
    csrfTokenGeneration,
    actionName,
    enforceSessionCookie,
    retrieveCharge,
    resolveLanguage,
    resolveService,
    stateEnforcer,
    decryptCardData
  ]

  const chargeCookieRequiredMiddlewareStack = [
    enforceSessionCookie,
    retrieveCharge,
    resolveLanguage
  ]

  const chargeNoCookieRequiredMiddlewareStack = [
    retrieveCharge,
    resolveLanguage
  ]

  app.get(card.new.path, standardMiddlewareStack, csp.cardDetails, charge.new)
  app.get(card.authWaiting.path, standardMiddlewareStack, charge.authWaiting)
  app.get(card.captureWaiting.path, standardMiddlewareStack, charge.captureWaiting)
  app.post(card.create.path, standardMiddlewareStack, charge.create)
  app.get(card.confirm.path, standardMiddlewareStack, charge.confirm)
  app.post(card.capture.path, standardMiddlewareStack, charge.capture)
  app.post(card.cancel.path, standardMiddlewareStack, charge.cancel)
  app.post(card.checkCard.path, chargeCookieRequiredMiddlewareStack, decryptCardData, charge.checkCard)
  app.get(card.return.path, chargeCookieRequiredMiddlewareStack, returnCont.return)

  app.get(card.auth3dsRequired.path, standardMiddlewareStack, threeDS.auth3dsRequired)
  app.get(card.auth3dsRequiredOut.path, standardMiddlewareStack, threeDS.auth3dsRequiredOut)
  app.post(card.auth3dsRequiredInEpdq.path, chargeNoCookieRequiredMiddlewareStack, threeDS.auth3dsRequiredInEpdq)
  app.get(card.auth3dsRequiredInEpdq.path, chargeNoCookieRequiredMiddlewareStack, threeDS.auth3dsRequiredInEpdq)
  app.post(card.auth3dsRequiredIn.path, chargeNoCookieRequiredMiddlewareStack, threeDS.auth3dsRequiredIn)
  app.get(card.auth3dsRequiredIn.path, chargeNoCookieRequiredMiddlewareStack, threeDS.auth3dsRequiredIn)
  app.post(card.auth3dsHandler.path, [actionName, enforceSessionCookie, retrieveCharge, resolveLanguage, resolveService, stateEnforcer], threeDS.auth3dsHandler)

  // Apple Pay endpoints
  app.post(paths.applePay.session.path, applePayMerchantValidation)

  // Generic Web payments endpoint
  app.post(paths.webPayments.authRequest.path, chargeCookieRequiredMiddlewareStack, webPaymentsMakePayment)
  app.get(paths.webPayments.handlePaymentResponse.path, chargeCookieRequiredMiddlewareStack, webPaymentsHandlePaymentResponse)

  // secure controller
  app.get(paths.secure.get.path, secure.new)
  app.post(paths.secure.post.path, secure.new)

  // static controller
  app.get(paths.static.humans.path, statik.humans)
  app.all(paths.static.naxsi_error.path, statik.naxsi_error)

  // security.txt — https://gds-way.cloudapps.digital/standards/vulnerability-disclosure.html
  const securitytxt = 'https://vdp.cabinetoffice.gov.uk/.well-known/security.txt'
  app.get('/.well-known/security.txt', (req, res) => res.redirect(securitytxt))
  app.get('/security.txt', (req, res) => res.redirect(securitytxt))

  // route to gov.uk 404 page
  // this has to be the last route registered otherwise it will redirect other routes
  app.all('*', (req, res) => res.redirect('https://www.gov.uk/404'))
}
