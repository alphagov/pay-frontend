var response = require(__dirname + '/utils/response.js').response;
var i18n = require('i18n');

var charge        = require('./controllers/charge_controller.js');
var secure        = require('./controllers/secure_controller.js');

var paths         = require(__dirname + '/paths.js');
var csrf          = require(__dirname + '/middleware/csrf.js');
var actionName    = require(__dirname + '/middleware/actionName.js');
var stateEnforcer = require(__dirname + '/middleware/state_enforcer.js');
var retrieveCharge= require(__dirname + '/middleware/retrieve_charge.js');

module.exports.paths = paths;

module.exports.bind = function (app) {
    app.get('/greeting', function (req, res) {
      var data = {'greeting': 'Hello', 'name': 'World'};
      response(req.headers.accept, res, 'greeting', data);
    });

  // ***** BACKWARD COMPATIBILITY CODE STARTS HERE *****
  var controllers   = require('./controllers');
  controllers.bindRoutesTo(app);
  // ***** BACKWARD COMPATIBILITY CODE FINISHES HERE *****

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
  app.post(card.create.path,  middlewareStack, charge.create);
  app.get(card.confirm.path,  middlewareStack, charge.confirm);
  app.post(card.capture.path, middlewareStack, charge.capture);

  // secure controller
  app.get(paths.secure.get.path, secure.new);
  app.post(paths.secure.post.path, secure.new);
};
