var charge_controller = require('./charge_controller');

// bind all controller routes to the app:
module.exports.bindRoutesTo = function(app) {
    charge_controller.bindRoutesTo(app);
}