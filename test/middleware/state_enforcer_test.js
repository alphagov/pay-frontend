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
      chargeData: { status: 'AUTHORISATION_SUCCESS', return_url: "foo" , gateway_account: {analytics_id: 'Test AnalyticsID', type: 'Test Type', payment_provider: 'Test Provider'}},
      chargeId: 1
    },response,next);
    expect(next.notCalled).to.be.true;
    assert(status.calledWith(200));
    assert(render.calledWith("errors/incorrect_state/auth_success",
      { chargeId: 1,
        analytics: {
          analyticsId: "Test AnalyticsID",
          type: "Test Type",
          paymentProvider: "Test Provider",
          path: '/card_details/1/in_progress'
        },
        returnUrl: '/return/1',
        viewName: 'AUTHORISATION_SUCCESS' }
    ));
  });

  it('should render the auth_waiting view the correct analytics when auth is rejected', function () {
    stateEnforcer({
      actionName: "card.new",
      chargeData: { status: 'AUTHORISATION_READY', return_url: "foo" , gateway_account: {analytics_id: 'Test AnalyticsID', type: 'Test Type', payment_provider: 'Test Provider'}},
      chargeId: 1
    },response,next);
    expect(next.notCalled).to.be.true;
    assert(status.calledWith(200));
    assert(render.calledWith("errors/incorrect_state/auth_waiting",
      { chargeId: 1,
        analytics: {
          analyticsId: "Test AnalyticsID",
          type: "Test Type",
          paymentProvider: "Test Provider",
          path: '/card_details/1/in_progress'
        },
        returnUrl: '/return/1',
        viewName: 'AUTHORISATION_READY' }
    ));
  });
  it('should throw an error when a view is passed in without having a state', function () {

    expect(function() { stateEnforcer({
      actionName: "hellothere",
      chargeData: { status: 'AUTHORISATION_SUCCESS', return_url: "foo" },
      chargeId: 1
    },response,next)}).to.throw(/Cannot find correct states for action/);
  });

  it('should render the confirm view when coming back from the service with the correct analytics', function () {
    stateEnforcer({
      actionName: "card.confirm",
      chargeData: { status: 'CAPTURED', return_url: "foo" , gateway_account: {analytics_id: 'Test AnalyticsID', type: 'Test Type', payment_provider: 'Test Provider'}},
      chargeId: 1
    },response,next);
    expect(next.notCalled).to.be.true;
    assert(status.calledWith(200));
    assert(render.calledWith("errors/charge_confirm_state_completed",
      { status: 'successful',
        chargeId: 1,
        analytics: {
          analyticsId: "Test AnalyticsID",
          type: "Test Type",
          paymentProvider: "Test Provider",
          path: '/card_details/1/success_return'
        },
        returnUrl: '/return/1',
        viewName: 'CAPTURED' }
    ));
  });

  it('should render the auth_failure view the correct analytics when auth is rejected', function () {
    stateEnforcer({
      actionName: "card.new",
      chargeData: { status: 'AUTHORISATION_REJECTED', return_url: "foo" , gateway_account: {analytics_id: 'Test AnalyticsID', type: 'Test Type', payment_provider: 'Test Provider'}},
      chargeId: 1
    },response,next);
    expect(next.notCalled).to.be.true;
    assert(status.calledWith(200));
    assert(render.calledWith("errors/incorrect_state/auth_failure",
      { chargeId: 1,
        analytics: {
          analyticsId: "Test AnalyticsID",
          type: "Test Type",
          paymentProvider: "Test Provider",
          path: '/card_details/1/auth_failure'
        },
        returnUrl: '/return/1',
        viewName: 'AUTHORISATION_REJECTED' }
    ));
  });

  it('should render the auth_failure view the correct analytics when auth is cancelled', function () {
    stateEnforcer({
      actionName: "card.new",
      chargeData: { status: 'AUTHORISATION_CANCELLED', return_url: "foo" , gateway_account: {analytics_id: 'Test AnalyticsID', type: 'Test Type', payment_provider: 'Test Provider'}},
      chargeId: 1
    },response,next);
    expect(next.notCalled).to.be.true;
    assert(status.calledWith(200));
    assert(render.calledWith("errors/incorrect_state/auth_failure",
      { chargeId: 1,
        analytics: {
          analyticsId: "Test AnalyticsID",
          type: "Test Type",
          paymentProvider: "Test Provider",
          path: '/card_details/1/auth_failure'
        },
        returnUrl: '/return/1',
        viewName: 'AUTHORISATION_CANCELLED' }
    ));
  });
  it('should render the capture_failure view the correct analytics when capture fails', function () {
    stateEnforcer({
      actionName: "card.new",
      chargeData: { status: 'CAPTURE_FAILURE', return_url: "foo" , gateway_account: {analytics_id: 'Test AnalyticsID', type: 'Test Type', payment_provider: 'Test Provider'}},
      chargeId: 1
    },response,next);
    expect(next.notCalled).to.be.true;
    assert(status.calledWith(200));
    assert(render.calledWith("errors/incorrect_state/capture_failure",
      { chargeId: 1,
        analytics: {
          analyticsId: "Test AnalyticsID",
          type: "Test Type",
          paymentProvider: "Test Provider",
          path: '/card_details/1/capture_failure'
        },
        returnUrl: '/return/1',
        viewName: 'CAPTURE_FAILURE' }
    ));
  });

  it('should render the capture_failure view the correct analytics when capture errors', function () {
    stateEnforcer({
      actionName: "card.new",
      chargeData: { status: 'CAPTURE_ERROR', return_url: "foo" , gateway_account: {analytics_id: 'Test AnalyticsID', type: 'Test Type', payment_provider: 'Test Provider'}},
      chargeId: 1
    },response,next);
    expect(next.notCalled).to.be.true;
    assert(status.calledWith(200));
    assert(render.calledWith("errors/incorrect_state/capture_failure",
      { chargeId: 1,
        analytics: {
          analyticsId: "Test AnalyticsID",
          type: "Test Type",
          paymentProvider: "Test Provider",
          path: '/card_details/1/capture_failure'
        },
        returnUrl: '/return/1',
        viewName: 'CAPTURE_ERROR' }
    ));
  });

  it('should render the capture_waiting view the correct analytics when capture is ready', function () {
    stateEnforcer({
      actionName: "card.new",
      chargeData: { status: 'CAPTURE_READY', return_url: "foo" , gateway_account: {analytics_id: 'Test AnalyticsID', type: 'Test Type', payment_provider: 'Test Provider'}},
      chargeId: 1
    },response,next);
    expect(next.notCalled).to.be.true;
    assert(status.calledWith(200));
    assert(render.calledWith("errors/incorrect_state/capture_waiting",
      { chargeId: 1,
        analytics: {
          analyticsId: "Test AnalyticsID",
          type: "Test Type",
          paymentProvider: "Test Provider",
          path: '/card_details/1/in_progress'
        },
        returnUrl: '/return/1',
        viewName: 'CAPTURE_READY' }
    ));
  });

});
