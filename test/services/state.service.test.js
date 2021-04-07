'use strict'

// NPM dependencies
const path = require('path')
const expect = require('chai').expect

// Local dependencies
const stateService = require(path.join(__dirname, '/../../app/services/state_service.js'))
const State = require(path.join(__dirname, '/../../config/state.js'))

describe('state service', function () {
  describe('resolveStates', function () {
    describe('when states cannot be resolved', function () {
      it('should throw an error', function () {
        expect(function () {
          stateService.resolveStates('unknown.action.name')
        }).to.throw(/Cannot find correct states for action/)
      })
    })

    describe('when states can be resolved', function () {
      it('should return the states', function () {
        expect(stateService.resolveStates('card.new')).to.eql([State.ENTERING_CARD_DETAILS, State.CREATED])
      })
    })
  })

  describe('resolveActionName', function () {
    describe('when action name cannot be resolved', function () {
      expect(function () {
        stateService.resolveActionName('unknown.action.name', 'foo')
      }).to.throw(/No actionName found for state: unknown.action.name and verb: foo/)
    })
  })

  describe('when action name can be resolved', function () {
    expect(stateService.resolveActionName(State.AUTH_SUCCESS, 'get')).to.eql('card.confirm')

    expect(stateService.resolveActionName(State.AUTH_READY, 'get')).to.eql('card.authWaiting')
    expect(stateService.resolveActionName(State.AUTH_3DS_REQUIRED, 'get')).to.eql('card.auth3dsRequired')
    expect(stateService.resolveActionName(State.AUTH_3DS_READY, 'get')).to.eql('card.authWaiting')

    expect(stateService.resolveActionName(State.CREATED, 'get')).to.eql('card.new')

    expect(stateService.resolveActionName(State.CAPTURE_READY, 'get')).to.eql('card.captureWaiting')
    expect(stateService.resolveActionName(State.CAPTURE_SUBMITTED, 'get')).to.eql('card.captureWaiting')
  })
})
