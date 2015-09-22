var charge_controller = require('./charge_controller');
var secure_controller = require('./secure_controller');

// bind all controller routes to the app:
module.exports.bindRoutesTo = function(app) {
    charge_controller.bindRoutesTo(app);
    secure_controller.bindRoutesTo(app);
}