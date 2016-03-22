var request = require('supertest');
var should = require('chai').should();
var _       = require('lodash');

var frontendCardDetailsPath = '/card_details';

var connectorChargePath = '/v1/frontend/charges/';
var chai_expect         = require('chai').expect;
var csrf                = require('csrf');
var nock                = require('nock');

function localServer() {
  return process.env.CONNECTOR_HOST;
}

function connectorAuthUrl(chargeId) {
  return localServer() + connectorChargePath + chargeId + '/cards';
}
function connectorCaptureUrl(chargeId) {
  return localServer() + connectorChargePath + chargeId + '/capture';
}

function connector_responds_with(chargeId, charge) {
  var connectorMock = nock(localServer());
  connectorMock.get(connectorChargePath + chargeId).reply(200, charge);
}

function init_connector_url() {
  process.env.CONNECTOR_URL = localServer() + connectorChargePath + '{chargeId}';
}


function raw_successful_get_charge(status, returnUrl, chargeId) {
  return {
    'amount': 2345,
    'description': "Payment Description",
    'status': status,
    'return_url': returnUrl,
    'links': [{
      'href': connectorAuthUrl(chargeId),
      'rel': 'cardAuth',
      'method': 'POST'
    }, {
      'href': connectorCaptureUrl(chargeId),
      'rel': 'cardCapture',
      'method': 'POST'
    }]
  }
}

module.exports = {
  responseTo: function (app, endpoint) {

    return {
      contains: function (expectedResponse) {
        return function (done) {
          request(app)
            .get(endpoint)
            .set('Accept', 'application/json')
            .expect(200)
            .end(function (err, res) {
              response = JSON.parse(res.text);
              Object.keys(expectedResponse).map(function (key) {
                expectedResponse[key].should.equal(response[key]);
              });
              done();
            });
        }
      }
    }
  },

  get_charge_request: function (app, cookieValue, chargeId) {
    return request(app)
      .get(frontendCardDetailsPath + '/' + chargeId)
      .set('Cookie', ['frontend_state=' + cookieValue])
      .set('Accept', 'application/json');
  },

  connector_response_for_put_charge: function (chargeId, statusCode , responseBody, override_url) {
    init_connector_url();
    url = (override_url) ? override_url : localServer();
    var connectorMock = nock(localServer());
    var mockPath = connectorChargePath + chargeId + '/status';
    var payload = {'new_status':'ENTERING CARD DETAILS'};
    connectorMock.put(mockPath, payload).reply(statusCode, responseBody);
  },

  default_connector_response_for_get_charge: function (chargeId, status) {
    init_connector_url();
    var returnUrl = 'http://www.example.com/service';
    raw_response = raw_successful_get_charge(status, returnUrl, chargeId);
    connector_responds_with(chargeId, raw_response);
  },

  raw_successful_get_charge: raw_successful_get_charge,

  templateValue: function(res,key,value){
    var body = JSON.parse(res.text);
    return chai_expect(_.result(body,key)).to.deep.equal(value);
  },

  templateValueNotUndefined: function(res,key){
    var body = JSON.parse(res.text);
    return chai_expect(_.result(body,key)).to.not.be.undefined;
  },

  unexpectedPromise: function(data){
    throw new Error('Promise was unexpectedly fulfilled.');
  },

  csrfToken: function(){
    return csrf().create(process.env.CSRF_USER_SECRET);
  }

};
