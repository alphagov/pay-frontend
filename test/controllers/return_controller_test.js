/*jslint node: true */

require(__dirname + '/../test_helpers/html_assertions.js');
var proxyquire = require('proxyquire')
var should = require('chai').should();
var assert = require('assert');
var q = require('q');
var sinon = require('sinon');
var paths = require('../../app/paths.js');


let requireReturnController = function (mockedCharge) {
  return proxyquire(__dirname + '/../../app/controllers/return_controller.js', {
    '../models/charge.js': mockedCharge,
    'csrf': function () {
      return {
        secretSync: function () {
          return 'foo';
        }
      }
    }
  })
};

describe('return controller', function () {
  let mockCharge = {
      cancelSucceeds: () => (cancelSucceeds) => {
        return {
          cancel: () => {
            let defer = q.defer();
            cancelSucceeds ? defer.resolve() : defer.reject();
            return defer.promise;
          }
        };
      }
    };

  let request, response;

  beforeEach(function () {
    request = {
      chargeId: 'aChargeId',
      headers:{'x-Request-id': 'unique-id'}
    };

    response = {
      redirect: sinon.spy(),
      render: sinon.spy(),
      status: sinon.spy()
    };
  });

  it('should redirect to the original service for terminal (non-cancelable) states', function () {
    request.chargeData = {
      status: "CAPTURED",
      return_url: 'http://a_return_url.com'
    };

    requireReturnController(mockCharge.cancelSucceeds(true)).return(request, response);
    assert(response.redirect.calledWith('http://a_return_url.com'));
  });

  it('should redirect to the original service for cancelable states', function () {
    request.chargeData = {
      status: "CREATED",
      return_url: 'http://a_return_url.com'
    };
    requireReturnController(mockCharge.cancelSucceeds(true)).return(request, response);
    setTimeout(function(){
      assert(response.redirect.calledWith('http://a_return_url.com'));
      done();
    },0);
  });

  it('should show an error if cancel fails', function () {
    request.chargeData = {
      status: "CREATED",
      return_url: 'http://a_return_url.com'
    };
    requireReturnController(mockCharge.cancelSucceeds(false)).return(request, response);
    setTimeout(function(){
      assert(response.render.calledWith("errors/system_error", { viewName: 'SYSTEM_ERROR' }));
      done();
    },0);
  });
});