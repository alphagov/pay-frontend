/*jslint node: true */
"use strict";
require(__dirname + '/../test_helpers/html_assertions.js');
var proxyquire = require('proxyquire');
var q = require('q');
var sinon = require('sinon');
var expect = require('chai').expect;
var paths = require('../../app/paths.js');


var mockCharge = function () {
  var mock = function (withSuccess, chargeObject) {
    return {
      findByToken: function () {
        return {
          then: function (success, fail) {
            return withSuccess ? success(chargeObject) : fail();
          }
        };
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
  };
}();

var mockToken = function () {
  var mock = function (withSuccess) {
    return {
      destroy: function () {
        return {
          then: function (success, fail) {
            return withSuccess ? success() : fail();
          }
        };
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
    return {
      then: function(success){
        success([{brand: "foo"}]);
      }
    };

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
}

describe('secure controller', function () {
  describe('get method', function () {

    var request, response, chargeObject;

    before(function () {
      request = {
        frontend_state: {},
        params: {chargeTokenId: 1}
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
          "service_name": "Service Name",
          cardTypes:[
    {
      brand: "visa",
      debit: true,
      credit: true
    }]
        }
      };
    });

    describe('when the token is invalid', function () {
      it('should display the generic error page', function () {
        requireSecureController(mockCharge.withFailure(), mockToken.withSuccess()).new(request, response);
        expect(response.render.calledWith('errors/system_error', {viewName: 'SYSTEM_ERROR'})).to.be.true;
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
        it('should store the service name into the session and redirect', function () {
          requireSecureController(mockCharge.withSuccess(chargeObject), mockToken.withSuccess(),mockedCard).new(request, response);

          expect(request.frontend_state).to.have.all.keys('ch_dh6kpbb4k82oiibbe4b9haujjk');
          expect(request.frontend_state['ch_dh6kpbb4k82oiibbe4b9haujjk']).to.eql({
            'csrfSecret': 'foo',
            'serviceName': 'Service Name',
            'cardTypes': [{
              "brand": 'visa',
              "credit": false,
              "debit": false
            }]
          });
          expect(response.redirect.calledWith(303,paths.generateRoute("card.new", {chargeId: chargeObject.externalId}))).to.be.true;
        });
      });
    });

  });
});


