'use strict'

// NPM dependencies
const AWSXRay = require('aws-xray-sdk')
const { getNamespace, createNamespace } = require('continuation-local-storage')

// Local dependencies
const logger = require('./utils/logger')(__filename)
const charge = require('./controllers/charge_controller.js')
const threeDS = require('./controllers/three_d_secure_controller.js')
const secure = require('./controllers/secure_controller.js')
const statik = require('./controllers/static_controller.js')
const applePayMerchantValidation = require('./controllers/web-payments/apple-pay/merchant-validation-controller')
const webPaymentsMakePayment = require('./controllers/web-payments/payment-auth-request-controller')
const webPaymentsHandlePaymentResponse = require('./controllers/web-payments/handle-auth-response-controller')
const returnCont = require('./controllers/return_controller.js')
const { healthcheck } = require('./controllers/healthcheck_controller.js')
const paths = require('./paths.js')

// Express middleware
const { csrfCheck, csrfTokenGeneration } = require('./middleware/csrf.js')
const csp = require('./middleware/csp')
const actionName = require('./middleware/action_name.js')
const stateEnforcer = require('./middleware/state_enforcer.js')
const retrieveCharge = require('./middleware/retrieve_charge.js')
const resolveService = require('./middleware/resolve_service.js')
const resolveLanguage = require('./middleware/resolve_language.js')
const xraySegmentCls = require('./middleware/x_ray')

// Constants
const clsXrayConfig = require('../config/xray-cls')

// Import AB test when we need to use it
// const abTest = require('./utils/ab_test.js')
// const AB_TEST_THRESHOLD = process.env.AB_TEST_THRESHOLD

exports.paths = paths

exports.bind = function (app) {
  AWSXRay.enableManualMode()
  AWSXRay.setLogger(logger)
  AWSXRay.middleware.setSamplingRules('aws-xray.rules')
  AWSXRay.config([AWSXRay.plugins.ECSPlugin])
  app.use(AWSXRay.express.openSegment('pay_frontend'))

  createNamespace(clsXrayConfig.nameSpaceName)

  app.use((req, res, next) => {
    const namespace = getNamespace(clsXrayConfig.nameSpaceName)
    namespace.bindEmitter(req)
    namespace.bindEmitter(res)
    namespace.run(() => {
      next()
    })
  })

  app.get('/healthcheck', healthcheck)

  // charges
  const card = paths.card

  const middlewareStack = [
    xraySegmentCls,
    csrfCheck,
    csrfTokenGeneration,
    actionName,
    retrieveCharge,
    resolveLanguage,
    resolveService,
    stateEnforcer
  ]

  app.get(card.new.path, csp.cardDetails, middlewareStack, charge.new)
  app.get(card.authWaiting.path, middlewareStack, charge.authWaiting)
  app.get(card.captureWaiting.path, middlewareStack, charge.captureWaiting)
  app.post(card.create.path, middlewareStack, charge.create)
  app.get(card.confirm.path, middlewareStack, charge.confirm)
  app.post(card.capture.path, middlewareStack, charge.capture)
  app.post(card.cancel.path, middlewareStack, charge.cancel)
  app.post(card.checkCard.path, xraySegmentCls, retrieveCharge, resolveLanguage, charge.checkCard)
  app.get(card.return.path, xraySegmentCls, retrieveCharge, resolveLanguage, returnCont.return)

  app.get(card.auth3dsRequired.path, middlewareStack, threeDS.auth3dsRequired)
  app.get(card.auth3dsRequiredOut.path, middlewareStack, threeDS.auth3dsRequiredOut)
  app.post(card.auth3dsRequiredInEpdq.path, [xraySegmentCls, retrieveCharge, resolveLanguage], threeDS.auth3dsRequiredInEpdq)
  app.get(card.auth3dsRequiredInEpdq.path, [xraySegmentCls, retrieveCharge, resolveLanguage], threeDS.auth3dsRequiredInEpdq)
  app.post(card.auth3dsRequiredIn.path, [xraySegmentCls, retrieveCharge, resolveLanguage], threeDS.auth3dsRequiredIn)
  app.get(card.auth3dsRequiredIn.path, [xraySegmentCls, retrieveCharge, resolveLanguage], threeDS.auth3dsRequiredIn)
  app.post(card.auth3dsHandler.path, [xraySegmentCls, actionName, retrieveCharge, resolveLanguage, resolveService, stateEnforcer], threeDS.auth3dsHandler)

  // Apple Pay endpoints
  app.post(paths.applePay.session.path, applePayMerchantValidation)

  // Generic Web payments endpoint
  app.post(paths.webPayments.authRequest.path, xraySegmentCls, retrieveCharge, resolveLanguage, webPaymentsMakePayment)
  app.get(paths.webPayments.handlePaymentResponse.path, xraySegmentCls, retrieveCharge, resolveLanguage, webPaymentsHandlePaymentResponse)

  // secure controller
  app.get(paths.secure.get.path, xraySegmentCls, secure.new)
  app.post(paths.secure.post.path, xraySegmentCls, secure.new)

  // static controller
  app.get(paths.static.humans.path, xraySegmentCls, statik.humans)
  app.all(paths.static.naxsi_error.path, xraySegmentCls, statik.naxsi_error)

  // route to gov.uk 404 page
  // this has to be the last route registered otherwise it will redirect other routes
  app.all('*', (req, res) => res.redirect('https://www.gov.uk/404'))

  app.use(AWSXRay.express.closeSegment())
}
