// Please leave here even though it looks unused - this enables Node.js metrics to be pushed to Hosted Graphite
if (process.env.DISABLE_APPMETRICS !== 'true') {
  require('./app/utils/metrics.js').metrics()
}

// Node.js core dependencies
const path = require('path')
const crypto = require('crypto')

// NPM dependencies
const express = require('express')
const nunjucks = require('nunjucks')
const favicon = require('serve-favicon')
const bodyParser = require('body-parser')
const i18n = require('i18n')
const staticify = require('staticify')(path.join(__dirname, 'public'))
const compression = require('compression')
const certinfo = require('cert-info')

// Local dependencies
const logger = require('./app/utils/logger')(__filename)
const loggingMiddleware = require('./app/middleware/logging_middleware')
const router = require('./app/routes')
const cookies = require('./app/utils/cookies')
const noCache = require('./app/utils/no_cache')
const session = require('./app/utils/session')
const i18nConfig = require('./config/i18n')
const i18nPayTranslation = require('./config/pay-translation')
const Sentry = require('./app/utils/sentry.js').initialiseSentry()
const csp = require('./app/middleware/csp')

// Global constants
const { NODE_ENV, PORT, ANALYTICS_TRACKING_ID, GOOGLE_PAY_MERCHANT_ID, APPLE_PAY_MERCHANT_ID_CERTIFICATE } = process.env
const CSS_PATH = '/stylesheets/application.min.css'
const JAVASCRIPT_PATH = '/javascripts/application.min.js'
const argv = require('minimist')(process.argv.slice(2))
const unconfiguredApp = express()
const oneYear = 86400000 * 365
const publicCaching = { maxAge: oneYear }

// Define app views
const APP_VIEWS = [
  path.join(__dirname, 'node_modules/govuk-frontend/'),
  path.join(__dirname, '/app/views')
]

function initialiseGlobalMiddleware (app) {
  logger.stream = {
    write: function (message) {
      logger.info(message)
    }
  }
  app.set('settings', { getVersionedPath: staticify.getVersionedPath })

  app.use(/\/((?!images|public|stylesheets|javascripts).)*/, loggingMiddleware())
  app.use(favicon(path.join(__dirname, '/node_modules/govuk-frontend/govuk/assets/images', 'favicon.ico')))
  app.use(staticify.middleware)

  app.use(function (req, res, next) {
    res.locals.asset_path = '/public/'
    res.locals.googlePayMerchantID = GOOGLE_PAY_MERCHANT_ID
    if (typeof ANALYTICS_TRACKING_ID === 'undefined') {
      logger.warn('Google Analytics Tracking ID [ANALYTICS_TRACKING_ID] is not set')
      res.locals.analyticsTrackingId = '' // to not break the app
    } else {
      res.locals.analyticsTrackingId = ANALYTICS_TRACKING_ID
    }
    res.locals.session = function () {
      return session.retrieve(req, req.chargeId)
    }
    res.locals.nonce = crypto.randomBytes(16).toString('hex')
    next()
  })

  app.use(function (req, res, next) {
    noCache(res)
    next()
  })

  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))

  app.use(compression())

  app.disable('x-powered-by')
}

function initialisei18n (app) {
  i18n.configure(i18nConfig)
  app.use(i18n.init)
  app.use(i18nPayTranslation)
}

function initialiseProxy (app) {
  app.enable('trust proxy')
}

function initialiseCookies (app) {
  cookies.configureSessionCookie(app)
}

function initialiseTemplateEngine (app) {
  // Configure nunjucks
  // see https://mozilla.github.io/nunjucks/api.html#configure
  const nunjucksConfiguration = {
    express: app, // the express app that nunjucks should install to
    autoescape: true, // controls if output with dangerous characters are escaped automatically
    throwOnUndefined: false, // throw errors when outputting a null/undefined value
    trimBlocks: true, // automatically remove trailing newlines from a block/tag
    lstripBlocks: true, // automatically remove leading whitespace from a block/tag
    watch: NODE_ENV !== 'production', // reload templates when they are changed (server-side). To use watch, make sure optional dependency chokidar is installed
    noCache: NODE_ENV !== 'production' // never use a cache and recompile templates each time (server-side)
  }

  // Initialise nunjucks environment
  const nunjucksEnvironment = nunjucks.configure(APP_VIEWS, nunjucksConfiguration)

  // Set view engine
  app.set('view engine', 'njk')

  // Version static assets on production for better caching
  // if it's not production we want to re-evaluate the assets on each file change
  nunjucksEnvironment.addGlobal('css_path', NODE_ENV === 'production' ? staticify.getVersionedPath(CSS_PATH) : CSS_PATH)
  nunjucksEnvironment.addGlobal('js_path', NODE_ENV === 'production' ? staticify.getVersionedPath(JAVASCRIPT_PATH) : JAVASCRIPT_PATH)
  nunjucksEnvironment.addGlobal('isDevelopment', NODE_ENV !== 'production')
}

function initialisePublic (app) {
  app.use('/public/worldpay', csp.worldpayIframe, express.static(path.join(__dirname, '/public/worldpay/'), publicCaching))
  app.use('/public', express.static(path.join(__dirname, '/public'), publicCaching))
  app.use('/public', express.static(path.join(__dirname, '/app/data'), publicCaching))
  app.use('/public', express.static(path.join(__dirname, '/govuk_modules/govuk-country-and-territory-autocomplete'), publicCaching))
  app.use('/javascripts', express.static(path.join(__dirname, '/public/assets/javascripts'), publicCaching))
  app.use('/images', express.static(path.join(__dirname, '/public/images'), publicCaching))
  app.use('/stylesheets', express.static(path.join(__dirname, '/public/assets/stylesheets'), publicCaching))
  app.use('/', express.static(path.join(__dirname, '/node_modules/govuk-frontend/govuk/')))
  app.use('/public', express.static(path.join(__dirname, '/node_modules/@govuk-pay/pay-js-commons/')))
}

function initialiseRoutes (app) {
  router.bind(app)
}

function listen () {
  const app = initialise()
  app.listen(PORT || 3000)
  logger.info('Listening on port ' + PORT || 3000)
}

function logApplePayCertificateTimeToExpiry () {
  if (APPLE_PAY_MERCHANT_ID_CERTIFICATE !== undefined) {
    const merchantIdCert = certinfo.info(APPLE_PAY_MERCHANT_ID_CERTIFICATE)
    const certificateTimeToExpiry = Math.floor((merchantIdCert.expiresAt - Date.now()) / 1000 / 60 / 60 / 24)
    logger.info(`The Apple Pay Merchant identity cert will expire in ${certificateTimeToExpiry} days`)
  }
}

/**
 * Configures app
 * @return app
 */
function initialise () {
  const app = unconfiguredApp
  app.use(Sentry.Handlers.requestHandler())
  initialiseProxy(app)

  initialiseGlobalMiddleware(app)
  initialisei18n(app)
  initialiseCookies(app)
  initialiseTemplateEngine(app)
  initialisePublic(app)
  initialiseRoutes(app) // This contains the 404 override and so should be last
  logApplePayCertificateTimeToExpiry()
  app.use(Sentry.Handlers.errorHandler())

  return app
}

/**
 * Starts app
 */
function start () {
  listen()
}

// Immediately invoke start if -i flag set. Allows script to be run by task runner
if (argv.i) {
  start()
}

module.exports = {
  start: start,
  getApp: initialise
}
