var should = require('chai').should();
var assert = require('assert');
var expect = require('chai').expect;
var views  = require(__dirname + '/../../app/utils/views.js');
var stateEnforcer  = require(__dirname + '/../../app/middleware/state_enforcer.js');

var sinon  = require('sinon');
var _      = require('lodash');


describe('state enforcer', function () {

  var response = {
    status: function(){},
    render: function(){}
  },
  status  = undefined,
  render  = undefined,
  next    = undefined;

  beforeEach(function(){
    status = sinon.stub(response,"status");
    render = sinon.stub(response,"render");
    next   = sinon.spy()
  });

  afterEach(function(){
    status.restore();
    render.restore();
  });

  it('should call next when everything is in the correct state', function () {
    stateEnforcer({
      actionName: "card.new",
      chargeData: { status: 'ENTERING CARD DETAILS'}
    },{},next)
    expect(next.calledOnce).to.be.true;
  });

  it('should NOT call next when an invalid state is called and render an error', function () {
    stateEnforcer({
      actionName: "card.new",
      chargeData: { status: 'INVALID STATE'}
    },response,next)
    expect(next.notCalled).to.be.true;
    assert(status.calledWith(500));
    assert(render.calledWith("error",
      { message: 'There is a problem, please try again later',
      viewName: 'error' }
    ));
  });

  it('should NOT call next when the object is in the wrong state is called and render the appropriate error view', function () {
    stateEnforcer({
      actionName: "card.new",
      chargeData: { status: 'AUTHORISATION_SUCCESS', return_url: "foo" },
      chargeId: 1
    },response,next)
    expect(next.notCalled).to.be.true;
    assert(status.calledWith(200));
    assert(render.calledWith("errors/incorrect_state/auth_success",
      { chargeId: 1,
        returnUrl: '/return',
        viewName: 'AUTHORISATION_SUCCESS' }
    ));
  });

  it('should throw an error when a view is passed in without having a state', function () {

    expect(function() { stateEnforcer({
      actionName: "hellothere",
      chargeData: { status: 'AUTHORISATION_SUCCESS', return_url: "foo" },
      chargeId: 1
    },response,next)}).to.throw(/Cannot find correct states for action/);
  });



});
