var should = require('chai').should();
var assert = require('assert');
var expect = require('chai').expect;
var views  = require(__dirname + '/../../app/utils/views.js');
var actionName  = require(__dirname + '/../../app/middleware/actionName.js');

var sinon  = require('sinon');
var _      = require('lodash');


describe('actionName', function () {
  it('should append the viewname to the request', function () {
    var next = sinon.spy(),
    req = {
      route: {
        methods: { post: true},
        path: "/card_details"
      }
    };
    actionName(req,{},next);
    expect(next.calledOnce).to.be.true;
    assert.equal(req.actionName,"card.create");
  });

  it('should not append the viewname to the request if it cannot match', function () {
    var next = sinon.spy(),
    req = {
      route: {
        methods: { post: true},
        path: "/invalid"
      }
    };
    actionName(req,{},next);
    expect(next.calledOnce).to.be.true;
    assert.equal(req.actionName,undefined);
  });
});
