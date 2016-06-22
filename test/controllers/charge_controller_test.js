require(__dirname + '/../test_helpers/html_assertions.js');
var proxyquire = require('proxyquire')
var sinon = require('sinon');

var mockCharge = function () {

  var mock = function () {
    var updateToEnterDetails = function () {
      return {
        then: function (success, fail) {
          return success();
        }
      };
    };

    return {
      updateToEnterDetails: updateToEnterDetails
    }
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
      params: {chargeTokenId: 1}
    };

    response = {
      redirect: sinon.spy(),
      render: sinon.spy(),
      status: sinon.spy()
    };
  });

  it('should not call update to enter card details if charge is already in ENTERING CARD DETAILS', function () {

    var charge = mockCharge.mock();
    var spyUpdateChargeCall = sinon.spy(charge, "updateToEnterDetails");

    requireChargeController(charge, mockNormalise.withCharge(aChargeWithStatus('ENTERING CARD DETAILS'))).new(request, response);
    sinon.assert.notCalled(spyUpdateChargeCall);
  });

  it('should update to enter card details if charge is in CREATED', function () {

    var charge = mockCharge.mock();
    var spyUpdateChargeCall = sinon.spy(charge, "updateToEnterDetails");

    requireChargeController(charge, mockNormalise.withCharge(aChargeWithStatus('CREATED'))).new(request, response);
    sinon.assert.calledOnce(spyUpdateChargeCall)

  });

});
