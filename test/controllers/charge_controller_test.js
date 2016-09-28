require(__dirname + '/../test_helpers/html_assertions.js');
var proxyquire = require('proxyquire')
var sinon = require('sinon');
var expect = require('chai').expect;

var mockCharge = function () {

  var mock = function (shouldSuccess) {
    return function () {
      var updateToEnterDetails = function () {
        return {
          then: function (success, fail) {
            return shouldSuccess ? success() : fail();
          }
        };
      };

      return {
        updateToEnterDetails: updateToEnterDetails
      }
    };
  };

  return {
    mock: mock
  }

}();

var mockNormalise = function () {
  var mock = function (chargeObject) {
    return {
      charge: function (data) {
        return chargeObject;
      }
    }
  };

  return {
    withCharge: mock
  }

}();

var mockSession = function () {
  var retrieve = function () {
    return [{
      brand: "visa",
      debit: true,
      credit: false
    }];
  };

  return {
    retrieve: retrieve
  };

}();

var requireChargeController = function (mockedCharge, mockedNormalise) {
  return proxyquire(__dirname + '/../../app/controllers/charge_controller.js', {
    '../models/charge.js': mockedCharge,
    '../services/normalise_charge.js': mockedNormalise,
    '../utils/session.js': mockSession
  });
};

describe('card details endpoint', function () {

  var request, response;

  var aChargeWithStatus = function (status) {
    return {
      "externalId": "dh6kpbb4k82oiibbe4b9haujjk",
      "status": status,
      "gatewayAccount": {
        "service_name": "Service Name"
      }
    };
  };

  before(function () {

    request = {
      query: {debitOnly : false},
      frontend_state: {},
      params: {chargeTokenId: 1},
      headers:{'x-request-id': 'unique-id'}
    };

    response = {
      redirect: sinon.spy(),
      render: sinon.spy(),
      status: sinon.spy()
    };
  });

  it('should not call update to enter card details if charge is already in ENTERING CARD DETAILS', function () {

    var mockedNormalisedCharge = aChargeWithStatus('ENTERING CARD DETAILS');
    var mockedNormalise = mockNormalise.withCharge(mockedNormalisedCharge);
    // To make sure this test does not proceed to chargeModel.updateToEnterDetails.
    // That is to differentiate from next test.
    var emptyChargeModel = {};

    requireChargeController(emptyChargeModel, mockedNormalise).new(request, response);
    expect(response.render.calledWith('charge', mockedNormalisedCharge)).to.be.true;
  });

  it('should update to enter card details if charge is in CREATED', function () {

    var charge = mockCharge.mock(true);

    var mockedNormalisedCharge = aChargeWithStatus('CREATED');
    var mockedNormalise = mockNormalise.withCharge(mockedNormalisedCharge);

    requireChargeController(charge, mockedNormalise).new(request, response);
    expect(response.render.calledWith('charge', mockedNormalisedCharge)).to.be.true;

  });

  it('should display NOT FOUND if updateToEnterDetails returns error', function () {

    var charge = mockCharge.mock(false);

    var mockedNormalisedCharge = aChargeWithStatus('CREATED');
    var mockedNormalise = mockNormalise.withCharge(mockedNormalisedCharge);

    requireChargeController(charge, mockedNormalise).new(request, response);
    expect(response.render.calledWith('error', {"message":"Page cannot be found","viewName":"NOT_FOUND"})).to.be.true;

  });
});
