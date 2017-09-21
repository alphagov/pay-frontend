// Please leave here even though it looks unused - this enables Node.js metrics to be pushed to Hosted Graphite
require('./app/utils/metrics.js').metrics()

var path = require('path')
var express = require('express')
var favicon = require('serve-favicon')
var router = require(path.join(__dirname, '/app/router.js'))
var bodyParser = require('body-parser')
var cookies = require(path.join(__dirname, '/app/utils/cookies.js'))
var logger = require('pino')()
var loggingMiddleware = require('morgan')
var noCache = require(path.join(__dirname, '/app/utils/no_cache.js'))
var i18n = require('i18n')
var port = process.env.PORT || 3000
var app = express()
var session = require('./app/utils/session.js')
var staticify = require('staticify')(path.join(__dirname, 'public'))
var compression = require('compression')
var oneYear = 86400000 * 365
var publicCaching = {maxAge: oneYear}

i18n.configure({
  locales: ['en'],
  directory: path.join(__dirname, '/locales'),
  objectNotation: true,
  defaultLocale: 'en',
  register: global
})
app.set('settings', {getVersionedPath: staticify.getVersionedPath})

app.use(/\/((?!images|public|stylesheets|javascripts).)*/, loggingMiddleware(
      ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - total time :response-time ms'))

app.use(i18n.init)
app.use(compression())
app.use(staticify.middleware)

app.enable('trust proxy')
app.disable('x-powered-by')

cookies.configureSessionCookie(app)

app.engine('html', require(path.join(__dirname, '/lib/template-engine.js')).__express)
app.set('view engine', 'html')
app.set('vendorViews', path.join(__dirname, '/govuk_modules/govuk_template/views/layouts'))
app.set('views', path.join(__dirname, '/app/views'))

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))

app.use('/javascripts', express.static(path.join(__dirname, '/public/assets/javascripts'), publicCaching))
app.use('/images', express.static(path.join(__dirname, '/public/images'), publicCaching))
app.use('/stylesheets', express.static(path.join(__dirname, '/public/assets/stylesheets'), publicCaching))

app.use('/public', express.static(path.join(__dirname, '/public'), publicCaching))
app.use('/public', express.static(path.join(__dirname, '/govuk_modules/govuk_template/assets'), publicCaching))
app.use('/public', express.static(path.join(__dirname, '/govuk_modules/govuk_frontend_toolkit'), publicCaching))

app.use(favicon(path.join(__dirname, 'govuk_modules', 'govuk_template', 'assets', 'images', 'favicon.ico')))
app.use(function (req, res, next) {
  res.locals.assetPath = '/public/'
  if (typeof process.env.ANALYTICS_TRACKING_ID === 'undefined') {
    logger.warn('Google Analytics Tracking ID [ANALYTICS_TRACKING_ID] is not set')
    res.locals.analyticsTrackingId = '' // to not break the app
  } else {
    res.locals.analyticsTrackingId = process.env.ANALYTICS_TRACKING_ID
  }
  res.locals.session = function () {
    return session.retrieve(req, req.chargeId)
  }
  next()
})

app.use(function (req, res, next) {
  noCache(res)
  next()
})

router.bind(app)

/**
 * Starts app
 */
function start () {
  app.listen(port)
  logger.info('Listening on port ' + port)
  return app
}

module.exports = {
  start: start,
  getApp: app
}
