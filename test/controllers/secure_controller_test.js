require(__dirname + '/../test_helpers/html_assertions.js');
var proxyquire = require('proxyquire')
var should = require('chai').should();
var assert = require('assert');
var q = require('q');
var sinon = require('sinon');
var expect = require('chai').expect;
var paths = require('../../app/paths.js');

var mockCharge = function () {
  var mock = function (withSuccess, chargeObject) {
    return {
      findByToken: function () {
        var defer = q.defer();
        (withSuccess) ? defer.resolve(chargeObject) : defer.reject();
        return defer.promise;
      }
    };
  };

  return {
    withSuccess: function (chargeObject) {
      return mock(true, chargeObject);
    },
    withFailure: function() {
      return mock(false);
    }
  }
}();

var mockToken = function () {
  var mock = function (withSuccess) {
    return function () {
      return {
        destroy: function () {
          var defer = q.defer();
          (withSuccess) ? defer.resolve() : defer.reject();
          return defer.promise;
        }
      }
    };
  };

  return {
    withSuccess: function () {
      return mock(true);
    },
    withFailure: function() {
      return mock(false);
    }
  }
}();

var mockedCard = function(){

  var allConnectorCardTypes = function(){
     var defer = q.defer();
    defer.resolve([{brand: "foo"}]);
    return defer.promise;

  };

  return {
    allConnectorCardTypes: allConnectorCardTypes
  };

};

var requireSecureController = function (mockedCharge, mockedToken) {
  return proxyquire(__dirname + '/../../app/controllers/secure_controller.js', {
    '../models/charge.js': mockedCharge,
    '../models/token.js': mockedToken,
    '../models/card.js': mockedCard,
    'csrf': function () {
      return {
        secretSync: function () {
          return 'foo';
        }
      }
    }
  })
};

describe('secure controller', function () {
  describe('get method', function () {

    var request, response, chargeObject;

    before(function () {
      request = {
        frontend_state: {},
        params: {chargeTokenId: 1},
        headers:{'X-Request-Id': 'unique-id'}
      };

      response = {
        redirect: sinon.spy(),
        render: sinon.spy(),
        status: sinon.spy()
      }

      chargeObject = {
        "externalId": "dh6kpbb4k82oiibbe4b9haujjk",
        "status": "CREATED",
        "gatewayAccount": {
          "service_name": "Service Name"
        }
      };
    });

    describe('when the token is invalid', function () {
      it('should display the generic error page', function (done) {
        requireSecureController(mockCharge.withFailure(), mockToken.withSuccess()).new(request, response);
        setTimeout(function(){
          expect(response.render.calledWith('errors/system_error', {viewName: 'SYSTEM_ERROR'})).to.be.true;
          done()
        },0);
      });
    });

    describe('when the token is valid', function () {
      describe('and not destroyed successfully', function () {
        it('should display the generic error page', function () {
          requireSecureController(mockCharge.withSuccess(), mockToken.withFailure()).new(request, response);
          expect(response.render.calledWith('errors/system_error', {viewName: 'SYSTEM_ERROR'})).to.be.true;
        });
      });

      describe('then destroyed successfully', function () {
        it('should store the service name into the session and redirect', function (done) {
          requireSecureController(mockCharge.withSuccess(chargeObject), mockToken.withSuccess()).new(request, response);

          setTimeout(function(){
            expect(response.redirect.calledWith(303,paths.generateRoute("card.new", {chargeId: chargeObject.externalId}))).to.be.true;

            expect(request.frontend_state).to.have.all.keys('ch_dh6kpbb4k82oiibbe4b9haujjk');
            expect(request.frontend_state['ch_dh6kpbb4k82oiibbe4b9haujjk']).to.eql({
              'csrfSecret': 'foo'
            });

            done();
          },0);

        });
      });
    });

  });
});


