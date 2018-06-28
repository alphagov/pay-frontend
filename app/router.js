'use strict'

const i18n = require('i18n')

const charge = require('./controllers/charge_controller.js')
const secure = require('./controllers/secure_controller.js')
const statik = require('./controllers/static_controller.js')
const returnCont = require('./controllers/return_controller.js')

const paths = require('./paths.js')
const {csrfCheck, csrfTokenGeneration} = require('./middleware/csrf.js')
const actionName = require('./middleware/action_name.js')
const stateEnforcer = require('./middleware/state_enforcer.js')
const retrieveCharge = require('./middleware/retrieve_charge.js')
const resolveService = require('./middleware/resolve_service.js')

// Import AB test when we need to use it
// const abTest = require('./utils/ab_test.js')
// const AB_TEST_THRESHOLD = process.env.AB_TEST_THRESHOLD

exports.paths = paths

exports.bind = function (app) {
  'use strict'

  app.get('/healthcheck', function (req, res) {
    const data = {'ping': {'healthy': true}}
    res.writeHead(200, {'Content-Type': 'application/json'})
    res.end(JSON.stringify(data))
  })

  // charges
  const card = paths.card

  const middlewareStack = [
    function (req, res, next) {
      i18n.setLocale('en')
      next()
    },
    csrfCheck,
    csrfTokenGeneration,
    actionName,
    retrieveCharge,
    resolveService,
    stateEnforcer
  ]

  app.get(card.new.path, middlewareStack, charge.new)
  app.get(card.authWaiting.path, middlewareStack, charge.authWaiting)
  app.get(card.auth3dsRequired.path, middlewareStack, charge.auth3dsRequired)
  app.get(card.auth3dsRequiredOut.path, middlewareStack, charge.auth3dsRequiredOut)
  app.post(card.auth3dsRequiredInEpdq.path, [csrfTokenGeneration, retrieveCharge], charge.auth3dsRequiredInEpdq)
  app.get(card.auth3dsRequiredInEpdq.path, [csrfTokenGeneration, retrieveCharge], charge.auth3dsRequiredInEpdq)
  app.post(card.auth3dsRequiredIn.path, [csrfTokenGeneration, retrieveCharge], charge.auth3dsRequiredIn)
  app.get(card.auth3dsRequiredIn.path, [csrfTokenGeneration, retrieveCharge], charge.auth3dsRequiredIn)
  app.post(card.auth3dsHandler.path, middlewareStack, charge.auth3dsHandler)
  app.get(card.captureWaiting.path, middlewareStack, charge.captureWaiting)
  app.post(card.create.path, middlewareStack, charge.create)
  app.get(card.confirm.path, middlewareStack, charge.confirm)
  app.post(card.capture.path, middlewareStack, charge.capture)
  app.post(card.cancel.path, middlewareStack, charge.cancel)
  app.post(card.checkCard.path, retrieveCharge, charge.checkCard)
  app.get(card.return.path, retrieveCharge, returnCont.return)

  // secure controller
  app.get(paths.secure.get.path, secure.new)
  app.post(paths.secure.post.path, secure.new)

  // static controller
  app.get(paths.static.humans.path, statik.humans)
  app.all(paths.static.naxsi_error.path, statik.naxsi_error)

  // route to gov.uk 404 page
  // this has to be the last route registered otherwise it will redirect other routes
  app.all('*', (req, res) => res.redirect('https://www.gov.uk/404'))
}
