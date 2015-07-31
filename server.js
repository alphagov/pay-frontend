var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var routes = require(__dirname + '/app/routes.js');
var port = (process.env.PORT || 3000);
var app = express();

app.engine('html', require(__dirname + '/lib/template-engine.js').__express);
app.set('view engine', 'html');
app.set('vendorViews', __dirname + '/govuk_modules/govuk_template/views/layouts');
app.set('views', __dirname + '/app/views');

app.use('/public', express.static(__dirname + '/public'));
app.use('/public', express.static(__dirname + '/govuk_modules/govuk_template/assets'));
app.use('/public', express.static(__dirname + '/govuk_modules/govuk_frontend_toolkit'));
app.use(favicon(path.join(__dirname, 'govuk_modules', 'govuk_template', 'assets', 'images','favicon.ico')));
app.use(function (req, res, next) {
  res.locals.assetPath = '/public/';
  next();
});

routes.bind(app);

app.listen(port);
console.log('');
console.log('Listening on port ' + port);
console.log('');

module.exports.getApp = app;
