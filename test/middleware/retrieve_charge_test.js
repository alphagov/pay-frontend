var should = require('chai').should();
var assert = require('assert');
var sinon  = require('sinon');
var _      = require('lodash');
var expect = require('chai').expect;
var nock   = require('nock');
var paths  = require('../../app/paths.js');

var retrieveCharge = require(__dirname + '/../../app/middleware/retrieve_charge.js');


describe('retrieve param test', function () {

  var response = {
    status: function(){},
    render: function(){}
  },
  status = undefined,
  render = undefined,
  next   = undefined,
  validRequest =  {
    params: { chargeId: "foo" },
    body: {},
    method: 'GET',
    frontend_state: { ch_foo: true }
  },
  chargeId = 'foo',
  connectorPath = paths.generateRoute(paths.connectorCharge.show.path,{chargeId: 'foo'});


  beforeEach(function(){
    status = sinon.stub(response,"status");
    render = sinon.stub(response,"render");
    next   = sinon.spy();
    nock.cleanAll();
  });

  afterEach(function(){
    status.restore();
    render.restore();
  });



  // We don't need to test all states as they are tested in
  // the charge param retriever tests
  it('should call not found view if charge param does not return an id', function () {
    retrieveCharge( { params: {}, body: {} },response,next)
    assert(status.calledWith(404));
    assert(render.calledWith('error',
      { message: "Page cannot be found",
        viewName: "NOT_FOUND" }
      ));
    expect(next.notCalled).to.be.true;

  });


  // test that apiFail gets charged, other states that call this are tested
  // by the charge model
  it("should call not found view if the connector does not respond", function(done) {
      retrieveCharge( validRequest,response,next)
      var testPromise = new Promise((resolve, reject) => {
          setTimeout(() => { resolve(); }, 20);
      });

      testPromise.then((result) => {
        try {
          assert(status.calledWith(404));
          assert(render.calledWith('error',
            { message: "Page cannot be found", viewName: "NOT_FOUND" }
          ));
          expect(next.notCalled).to.be.true;
          done();
        }
        catch(err) { done(err); }
      }, done);
  });



  it("should set chargeData chargeID and call next on success", function(done) {
      var chargeData = {foo:"bar"};
      nock(process.env.CONNECTOR_HOST)
        .get(`/v1/frontend/charges/${chargeId}`)
        .reply(200,chargeData);
      retrieveCharge( validRequest,response,next )

      var testPromise = new Promise((resolve, reject) => {
          setTimeout(() => { resolve(); }, 20);
      });

      testPromise.then((result) => {
        try {
          expect(status.calledWith(200));
          expect(validRequest.chargeId).to.equal(chargeId);
          expect(validRequest.chargeData).to.deep.equal(chargeData);
          expect(next.called).to.be.true;
          done();
        }
        catch(err) { done(err); }
      }, done);
  });





})
