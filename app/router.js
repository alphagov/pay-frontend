var response = require(__dirname + '/utils/response.js').response;

var controllers   = require('./controllers');
var charge        = require('./controllers/charge_controller.js');

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

  controllers.bindRoutesTo(app);

  var card = paths.card;
  app.get(card.new.path, csrf, actionName, retrieveCharge, stateEnforcer, charge.new);
  app.post(card.create.path, csrf, actionName, retrieveCharge, stateEnforcer, charge.create);
  app.get(card.confirm.path, csrf, actionName, retrieveCharge, stateEnforcer, charge.confirm);
  app.post(card.capture.path, csrf, actionName, retrieveCharge, stateEnforcer, charge.capture);
};
