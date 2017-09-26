const _ = require('lodash')
const State = require('../models/state.js')
const paths = require('../paths.js')

// The logic will always resolve to the first successful match.
// Changing the order of the states might have side-effects
const STATES = {
  'card.new': [State.ENTERING_CARD_DETAILS, State.CREATED],
  'card.confirm': [State.AUTH_SUCCESS],
  'card.auth3dsRequired': [State.AUTH_3DS_REQUIRED],
  'card.auth3dsRequiredIn': [State.AUTH_3DS_REQUIRED],
  'card.auth3dsHandler': [State.AUTH_3DS_REQUIRED],
  'card.auth3dsRequiredOut': [State.AUTH_3DS_REQUIRED],
  'card.authWaiting': [State.AUTH_READY, State.AUTH_3DS_REQUIRED, State.AUTH_3DS_READY, State.AUTH_SUCCESS],
  'card.create': [State.AUTH_READY, State.ENTERING_CARD_DETAILS],
  'card.capture': [State.AUTH_SUCCESS],
  'card.captureWaiting': [State.CAPTURE_READY, State.CAPTURE_SUBMITTED],
  'card.cancel': [State.ENTERING_CARD_DETAILS, State.AUTH_SUCCESS]
}

function resolveStates (actionName) {
  const states = STATES[actionName]
  if (!states) throw new Error('Cannot find correct states for action')
  return states
}

function resolveActionName (state, verb) {
  const possibleActionNames = _.reduce(STATES, function (result, value, key) {
    var hasState = _.includes(value, state)
    if (hasState) result.push(key)
    return result
  }, [])

  const validActionNames = _.filter(possibleActionNames, function (actionName) {
    return _.result(paths, actionName).action === verb
  })

  if (validActionNames.length < 1) throw new Error(`No actionName found for state: ${state} and verb: ${verb}`)

  return validActionNames[0]
}

module.exports = {
  resolveStates: resolveStates,
  resolveActionName: resolveActionName
}
