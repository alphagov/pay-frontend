var secure_controller = require('./secure_controller');

// bind all controller routes to the app:
module.exports.bindRoutesTo = function(app) {
  secure_controller.bindRoutesTo(app);
};
