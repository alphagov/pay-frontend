var i18n = require('i18n');

var charge        = require('./controllers/charge_controller.js');
var secure        = require('./controllers/secure_controller.js');
var statik        = require('./controllers/static_controller.js');
var returnCont    = require('./controllers/return_controller.js');

var paths         = require(__dirname + '/paths.js');
var csrf          = require(__dirname + '/middleware/csrf.js');
var actionName    = require(__dirname + '/middleware/action_name.js');
var stateEnforcer = require(__dirname + '/middleware/state_enforcer.js');
var retrieveCharge= require(__dirname + '/middleware/retrieve_charge.js');


module.exports.paths = paths;

module.exports.bind = function (app) {
  'use strict';

  app.get('/healthcheck', function (req, res) {
    var data = {'ping': {'healthy': true}};
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(data));
  });

  // charges
  var card = paths.card;
  var middlewareStack = [
    function(req,res,next) { i18n.setLocale('en'); next();},
    csrf,
    actionName,
    retrieveCharge,
    stateEnforcer
  ];

  app.get(card.new.path,      middlewareStack, charge.new);
  app.get(card.authWaiting.path, middlewareStack, charge.authWaiting);
  app.get(card.auth3dsRequired.path, middlewareStack, charge.auth3dsRequired);
  app.get(card.captureWaiting.path, middlewareStack, charge.captureWaiting);
  app.post(card.create.path,  middlewareStack, charge.create);
  app.get(card.confirm.path,  middlewareStack, charge.confirm);
  app.post(card.capture.path, middlewareStack, charge.capture);
  app.post(card.cancel.path,  middlewareStack, charge.cancel);
  app.post(card.checkCard.path, retrieveCharge, charge.checkCard);
  app.get(card.return.path, retrieveCharge, returnCont.return);


  // secure controller
  app.get(paths.secure.get.path, secure.new);
  app.post(paths.secure.post.path, secure.new);

  // static controller
  app.get(paths.static.privacy.path, statik.privacy);
  app.get(paths.static.humans.path, statik.humans);
  app.all(paths.static.naxsi_error.path, statik.naxsi_error);


};
