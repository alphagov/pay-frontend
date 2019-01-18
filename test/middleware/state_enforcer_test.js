'use strict'

const path = require('path')
const assert = require('assert')
const expect = require('chai').expect
const stateEnforcer = require(path.join(__dirname, '/../../app/middleware/state_enforcer.js'))

const sinon = require('sinon')

describe('state enforcer', function () {
  const response = {
    status: function () {},
    render: function () {}
  }
  let status
  let render
  let next

  beforeEach(function () {
    status = sinon.stub(response, 'status')
    render = sinon.stub(response, 'render')
    next = sinon.spy()
  })

  afterEach(function () {
    status.restore()
    render.restore()
  })

  it('should call next when everything is in the correct state', function () {
    stateEnforcer({
      actionName: 'card.new',
      chargeData: {status: 'ENTERING CARD DETAILS', gateway_account: {payment_provider: 'Test Provider'}}
    }, {}, next)
    expect(next.calledOnce).to.be.true // eslint-disable-line
  })

  it('should call next when Stripe charge is in AUTH_3DS_READY', function () {
    stateEnforcer({
      actionName: 'card.auth3dsHandler',
      chargeData: {status: 'AUTHORISATION 3DS READY', gateway_account: {payment_provider: 'stripe'}}
    }, {}, next)
    expect(next.calledOnce).to.be.true // eslint-disable-line
  })

  it('should NOT call next when an invalid state is called and render an error', function () {
    stateEnforcer({
      actionName: 'card.new',
      chargeData: {status: 'INVALID STATE', gateway_account: {payment_provider: 'Test Provider'}}
    }, response, next)
    expect(next.notCalled).to.be.true // eslint-disable-line
    assert(status.calledWith(500))
    assert(render.calledWith('error',
      { message: 'There is a problem, please try again later',
        viewName: 'error' }
    ))
  })

  it('should NOT call next when the object is in the wrong state is called and render the appropriate error view', function () {
    stateEnforcer({
      actionName: 'card.new',
      chargeData: {status: 'AUTHORISATION_SUCCESS', return_url: 'foo', gateway_account: {analytics_id: 'Test AnalyticsID', type: 'Test Type', payment_provider: 'Test Provider'}},
      chargeId: 1
    }, response, next)
    expect(next.notCalled).to.be.true // eslint-disable-line
    assert(status.calledWith(200))
    assert(render.calledWith('errors/incorrect_state/auth_success',
      { chargeId: 1,
        analytics: {
          analyticsId: 'Test AnalyticsID',
          type: 'Test Type',
          paymentProvider: 'Test Provider',
          path: '/card_details/1/in_progress'
        },
        returnUrl: '/return/1',
        viewName: 'AUTHORISATION_SUCCESS' }
    ))
  })

  it('should render the auth_waiting view the correct analytics when auth is rejected', function () {
    stateEnforcer({
      actionName: 'card.new',
      chargeData: {status: 'AUTHORISATION_READY', return_url: 'foo', gateway_account: {analytics_id: 'Test AnalyticsID', type: 'Test Type', payment_provider: 'Test Provider'}},
      chargeId: 1
    }, response, next)
    expect(next.notCalled).to.be.true // eslint-disable-line
    assert(status.calledWith(200))
    assert(render.calledWith('errors/incorrect_state/auth_waiting',
      { chargeId: 1,
        analytics: {
          analyticsId: 'Test AnalyticsID',
          type: 'Test Type',
          paymentProvider: 'Test Provider',
          path: '/card_details/1/in_progress'
        },
        returnUrl: '/return/1',
        viewName: 'AUTHORISATION_READY' }
    ))
  })
  it('should throw an error when a view is passed in without having a state', function () {
    expect(function () {
      stateEnforcer({
        actionName: 'hellothere',
        chargeData: {status: 'AUTHORISATION_SUCCESS', return_url: 'foo'},
        chargeId: 1
      }, response, next)
    }).to.throw(/Cannot find correct states for action/)
  })

  it('should render the confirm view when coming back from the service with the correct analytics', function () {
    stateEnforcer({
      actionName: 'card.confirm',
      chargeData: {status: 'CAPTURED', return_url: 'foo', gateway_account: {analytics_id: 'Test AnalyticsID', type: 'Test Type', payment_provider: 'Test Provider'}},
      chargeId: 1
    }, response, next)
    expect(next.notCalled).to.be.true // eslint-disable-line
    assert(status.calledWith(200))
    assert(render.calledWith('errors/charge_confirm_state_completed',
      { status: 'successful',
        chargeId: 1,
        analytics: {
          analyticsId: 'Test AnalyticsID',
          type: 'Test Type',
          paymentProvider: 'Test Provider',
          path: '/card_details/1/success_return'
        },
        returnUrl: '/return/1',
        viewName: 'CAPTURED' }
    ))
  })

  it('should render the auth_failure view the correct analytics when auth is rejected', function () {
    stateEnforcer({
      actionName: 'card.new',
      chargeData: {status: 'AUTHORISATION_REJECTED', return_url: 'foo', gateway_account: {analytics_id: 'Test AnalyticsID', type: 'Test Type', payment_provider: 'Test Provider'}},
      chargeId: 1
    }, response, next)
    expect(next.notCalled).to.be.true // eslint-disable-line
    assert(status.calledWith(200))
    assert(render.calledWith('errors/incorrect_state/auth_failure',
      { chargeId: 1,
        analytics: {
          analyticsId: 'Test AnalyticsID',
          type: 'Test Type',
          paymentProvider: 'Test Provider',
          path: '/card_details/1/auth_failure'
        },
        returnUrl: '/return/1',
        viewName: 'AUTHORISATION_REJECTED' }
    ))
  })

  it('should render the auth_failure view the correct analytics when auth is cancelled', function () {
    stateEnforcer({
      actionName: 'card.new',
      chargeData: {status: 'AUTHORISATION_CANCELLED', return_url: 'foo', gateway_account: {analytics_id: 'Test AnalyticsID', type: 'Test Type', payment_provider: 'Test Provider'}},
      chargeId: 1
    }, response, next)
    expect(next.notCalled).to.be.true // eslint-disable-line
    assert(status.calledWith(200))
    assert(render.calledWith('errors/incorrect_state/auth_failure',
      { chargeId: 1,
        analytics: {
          analyticsId: 'Test AnalyticsID',
          type: 'Test Type',
          paymentProvider: 'Test Provider',
          path: '/card_details/1/auth_failure'
        },
        returnUrl: '/return/1',
        viewName: 'AUTHORISATION_CANCELLED' }
    ))
  })
  it('should render the capture_failure view the correct analytics when capture fails', function () {
    stateEnforcer({
      actionName: 'card.new',
      chargeData: {status: 'CAPTURE_FAILURE', return_url: 'foo', gateway_account: {analytics_id: 'Test AnalyticsID', type: 'Test Type', payment_provider: 'Test Provider'}},
      chargeId: 1
    }, response, next)
    expect(next.notCalled).to.be.true // eslint-disable-line
    assert(render.calledWith('errors/incorrect_state/capture_failure',
      { chargeId: 1,
        analytics: {
          analyticsId: 'Test AnalyticsID',
          type: 'Test Type',
          paymentProvider: 'Test Provider',
          path: '/card_details/1/capture_failure'
        },
        returnUrl: '/return/1',
        viewName: 'CAPTURE_FAILURE' }
    ))
  })

  it('should render the capture_failure view the correct analytics when capture errors', function () {
    stateEnforcer({
      actionName: 'card.new',
      chargeData: {status: 'CAPTURE_ERROR', return_url: 'foo', gateway_account: {analytics_id: 'Test AnalyticsID', type: 'Test Type', payment_provider: 'Test Provider'}},
      chargeId: 1
    }, response, next)
    expect(next.notCalled).to.be.true // eslint-disable-line
    assert(status.calledWith(200))
    assert(render.calledWith('errors/incorrect_state/capture_failure',
      { chargeId: 1,
        analytics: {
          analyticsId: 'Test AnalyticsID',
          type: 'Test Type',
          paymentProvider: 'Test Provider',
          path: '/card_details/1/capture_failure'
        },
        returnUrl: '/return/1',
        viewName: 'CAPTURE_ERROR' }
    ))
  })

  it('should render the capture_waiting view the correct analytics when capture is ready', function () {
    stateEnforcer({
      actionName: 'card.new',
      chargeData: {status: 'CAPTURE_READY', return_url: 'foo', gateway_account: {analytics_id: 'Test AnalyticsID', type: 'Test Type', payment_provider: 'Test Provider'}},
      chargeId: 1
    }, response, next)
    expect(next.notCalled).to.be.true // eslint-disable-line 
    assert(status.calledWith(200))
    assert(render.calledWith('errors/incorrect_state/capture_waiting',
      { chargeId: 1,
        analytics: {
          analyticsId: 'Test AnalyticsID',
          type: 'Test Type',
          paymentProvider: 'Test Provider',
          path: '/card_details/1/in_progress'
        },
        returnUrl: '/return/1',
        viewName: 'CAPTURE_READY' }
    ))
  })
})
