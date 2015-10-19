var request = require('supertest');
var should = require('chai').should();

var frontendCardDetailsPath = '/card_details';

var connectorChargePath = '/v1/frontend/charges/';

var nock = require('nock');

function localServer(connectorPort) {
    return 'http://localhost:' + connectorPort;
}

function connectorAuthUrl(connectorPort, chargeId) {
    return localServer(connectorPort) + connectorChargePath + chargeId + '/cards';
}
function connectorCaptureUrl(connectorPort, chargeId) {
    return localServer(connectorPort) + connectorChargePath + chargeId + '/capture';
}

function connector_responds_with(connectorPort, chargeId, charge) {
    var connectorMock = nock(localServer(connectorPort));
    connectorMock.get(connectorChargePath + chargeId).reply(200, charge);
}

function init_connector_url(connectorPort) {
    process.env.CONNECTOR_URL = localServer(connectorPort) + connectorChargePath + '{chargeId}';
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
            .set('Cookie', ['session_state=' + cookieValue])
            .set('Accept', 'application/json');
    },

    connector_response_for_put_charge: function (connectorPort, chargeId, statusCode , responseBody) {
        init_connector_url(connectorPort);
        var connectorMock = nock(localServer(connectorPort));
        var mockPath = connectorChargePath + chargeId + '/status';
        var payload = {'new_status':'ENTERING CARD DETAILS'};
        connectorMock.put(mockPath, payload).reply(statusCode, responseBody);
    },

    default_connector_response_for_get_charge: function (connectorPort, chargeId, status) {
        init_connector_url(connectorPort);
        var returnUrl = 'http://www.example.com/service';
        connector_responds_with(connectorPort, chargeId, {
            'amount': 2345,
            'status': status,
            'return_url': returnUrl,
            'links': [{
                'href': connectorAuthUrl(connectorPort, chargeId),
                'rel': 'cardAuth',
                'method': 'POST'
            }, {
                'href': connectorCaptureUrl(connectorPort, chargeId),
                'rel': 'cardCapture',
                'method': 'POST'
            }]
        });
    }
};
