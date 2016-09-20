if (process.env.ENABLE_NEWRELIC == 'yes') require('newrelic');
var express           = require('express');
var path              = require('path');
var favicon           = require('serve-favicon');
var router            = require(__dirname + '/app/router.js');
var bodyParser        = require('body-parser');
var clientSessions    = require("client-sessions");
var frontendCookie    = require(__dirname + '/app/utils/cookies.js').frontendCookie;
var logger            = require('winston');
var loggingMiddleware = require('morgan');
var noCache           = require(__dirname + '/app/utils/no_cache.js');
var customCertificate = require(__dirname + '/app/utils/custom_certificate.js');
var i18n              = require('i18n');
var port              = (process.env.PORT || 3000);
var argv              = require('minimist')(process.argv.slice(2));
var app               = express();
var session           = require('./app/utils/session.js');
var environment       = require('./app/services/environment.js');
var staticify         = require("staticify")(path.join(__dirname, "public"));
var compression       = require('compression');
var oneYear           = 86400000 * 365;
var publicCaching     = {maxAge: oneYear};

i18n.configure({
  locales: ['en'],
  directory: __dirname + '/locales',
  objectNotation: true,
  defaultLocale: 'en',
  register: global
});
app.set('settings', {getVersionedPath: staticify.getVersionedPath});
logger.stream = {
  write: function (message) {
    logger.info(message);
  }
};
app.use(/\/((?!images|public|stylesheets|javascripts).)*/, loggingMiddleware(
      ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - total time :response-time ms'));

app.use(i18n.init);
app.use(compression());
app.use(staticify.middleware);

app.enable('trust proxy');
app.use(clientSessions(frontendCookie()));

if (process.env.DISABLE_INTERNAL_HTTPS !== "true") {
  customCertificate.use();
}
else {
  logger.warn('DISABLE_INTERNAL_HTTPS is set.');
}

app.engine('html', require(__dirname + '/lib/template-engine.js').__express);
app.set('view engine', 'html');
app.set('vendorViews', __dirname + '/govuk_modules/govuk_template/views/layouts');
app.set('views', __dirname + '/app/views');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use('/javascripts', express.static(__dirname + '/public/assets/javascripts', publicCaching));
app.use('/images', express.static(__dirname + '/public/images', publicCaching));
app.use('/stylesheets', express.static(__dirname + '/public/assets/stylesheets', publicCaching));

app.use('/public', express.static(__dirname + '/public', publicCaching));
app.use('/public', express.static(__dirname + '/govuk_modules/govuk_template/assets', publicCaching));
app.use('/public', express.static(__dirname + '/govuk_modules/govuk_frontend_toolkit', publicCaching));

app.use(favicon(path.join(__dirname, 'govuk_modules', 'govuk_template', 'assets', 'images', 'favicon.ico')));
app.use(function (req, res, next) {
  res.locals.assetPath = '/public/';
  if (typeof process.env.ANALYTICS_TRACKING_ID === "undefined") {
    logger.warn('Google Analytics Tracking ID [ANALYTICS_TRACKING_ID] is not set');
    res.locals.analyticsTrackingId = ""; //to not break the app
  } else {
    res.locals.analyticsTrackingId = process.env.ANALYTICS_TRACKING_ID;
  }
  res.locals.session = function () {
    return session.retrieve(req, req.chargeId);
  };
  next();
});

app.use(function (req, res, next) {
  noCache(res);
  next();
});

if (!environment.isProduction()) {
  // Will return stack traces to the browser as well - only use in development!
  var errorhandler = require('errorhandler');
  app.use(errorhandler())
}

router.bind(app);

/**
 * Starts app
 */
function start() {
  app.listen(port);
  logger.info('Listening on port ' + port);
  return app;
}

//immediately invoke start if -i flag set. Allows script to be run by task runner
if (!!argv.i) {
  start();
}

module.exports = {
  start: start,
  getApp: app
};
