var path = require('path')
var assert = require('assert')
var expect = require('chai').expect
var actionName = require(path.join(__dirname, '/../../app/middleware/action_name.js'))

var sinon = require('sinon')

describe('actionName', function () {
  it('should append the viewname to the request', function () {
    var next = sinon.spy()
    var req = {
      route: {
        methods: {post: true},
        path: '/card_details/:chargeId'
      }
    }
    actionName(req, {}, next)
    expect(next.calledOnce).to.be.true // eslint-disable-line
    assert.equal(req.actionName, 'card.create')
  })

  it('should not append the viewname to the request if it cannot match', function () {
    var next = sinon.spy()
    var req = {
      route: {
        methods: {post: true},
        path: '/invalid'
      }
    }
    actionName(req, {}, next)
    expect(next.calledOnce).to.be.true // eslint-disable-line 
    assert.equal(req.actionName, undefined)
  })
})
