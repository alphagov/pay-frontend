var response = require(__dirname + '/utils/response.js').response;

var controllers   = require('./controllers');
var charge        = require('./controllers/charge_controller.js');

var paths         = require(__dirname + '/paths.js');
var actionName    = require(__dirname + '/middleware/actionName.js');
var stateEnforcer = require(__dirname + '/middleware/state_enforcer.js');

var generateRoute = require(__dirname + '/utils/generate_route.js');
var chargeParam   = require('./services/charge_param_retriever.js');
var views         = require('./utils/views.js');
var Charge        = require('./models/charge.js');




module.exports.generateRoute = generateRoute;
module.exports.paths = paths;


var retrieveCharge = function(req, res, next){
  var _views  = views.create({}),
  chargeId    = req.chargeId;

  var init = function(){
    var chargeId = chargeParam.retrieve(req);
    if (!chargeId) return _views.display(res,"NOT_FOUND");
    req.chargeId = chargeId;
    Charge.find(chargeId).then(gotCharge, apiFail);
  },

  gotCharge = function(data){
    req.chargeData = data;
    next();
  },

  apiFail = function(error){
    _views.display(res,"NOT_FOUND");
  };

  init();
};


module.exports.bind = function (app) {
    app.get('/greeting', function (req, res) {
      var data = {'greeting': 'Hello', 'name': 'World'};
      response(req.headers.accept, res, 'greeting', data);
    });

  controllers.bindRoutesTo(app);

  var card = paths.card;
  app.get(card.new.path, actionName, retrieveCharge, stateEnforcer, charge.new);
  app.post(card.create.path, actionName, retrieveCharge, charge.create);
  app.get(card.confirm.path, actionName, retrieveCharge, stateEnforcer, charge.confirm);
  app.post(card.capture.path, actionName, retrieveCharge, charge.capture);
};
