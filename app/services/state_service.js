var _ = require('lodash'),
State = require('../models/state.js'),
paths = require('../paths.js');


module.exports = function () {

  var STATES = {
    "card.new": [State.ENTERING_CARD_DETAILS, State.CREATED],
    "card.authWaiting": [State.AUTH_READY_STATE,State.AUTH_SUCCESS_STATE],
    "card.create": [State.ENTERING_CARD_DETAILS],
    "card.confirm": [State.AUTH_SUCCESS],
    "card.capture": [State.AUTH_SUCCESS],
  };

  var resolveStates = function (actionName) {
    var states = STATES[actionName];
    if (!states) throw new Error('Cannot find correct states for action');
    return states;
  }

  var resolveActionName = function (state, verb) {

    var possibleActionNames = _.reduce(STATES, function(result, value, key) {
      var hasState = _.includes(value, state);
      if (hasState) result.push(key); 
      return result;
    }, []);


    var validActionNames = _.filter(possibleActionNames, function(actionName) {
      return _.result(paths,actionName).action === verb;
    });

    if (validActionNames.length < 1) throw new Error(`No actionName found for state: ${state} and verb: ${verb}`); 
    if (validActionNames.length > 1) throw new Error(`Multiple actionNames found for state: ${state} and verb: ${verb}`); 

    return validActionNames[0];
  }

  return {
    resolveStates: resolveStates,
    resolveActionName: resolveActionName
  }
}();

