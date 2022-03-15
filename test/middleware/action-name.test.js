const assert = require('assert')
const expect = require('chai').expect
const actionName = require('../../app/middleware/action-name.js')

const sinon = require('sinon')

describe('actionName', function () {
  it('should append the viewname to the request', function () {
    const next = sinon.spy()
    const req = {
      method: 'POST',
      route: {
        path: '/card_details/:chargeId'
      }
    }
    actionName(req, {}, next)
    expect(next.calledOnce).to.be.true // eslint-disable-line
    assert.strictEqual(req.actionName, 'card.create')
  })

  it('should not append the viewname to the request if it cannot match', function () {
    const next = sinon.spy()
    const req = {
      method: 'POST',
      route: {
        path: '/invalid'
      }
    }
    actionName(req, {}, next)
    expect(next.calledOnce).to.be.true // eslint-disable-line
    assert.strictEqual(req.actionName, undefined)
  })
})
