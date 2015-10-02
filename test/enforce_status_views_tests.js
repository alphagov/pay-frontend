process.env.SESSION_ENCRYPTION_KEY = 'naskjwefvwei72rjkwfmjwfi72rfkjwefmjwefiuwefjkbwfiu24fmjbwfk';

var request = require('supertest');
var portfinder = require('portfinder');
var nock = require('nock');
var app = require(__dirname + '/../server.js').getApp;
var should = require('chai').should();

var cookie = require(__dirname + '/utils/session.js');

portfinder.getPort(function (err, connectorPort) {
    var localServer = 'http://localhost:' + connectorPort;

    var connectorChargePath = '/v1/frontend/charges/';
    var chargeId = '23144323';
    var frontendCardDetailsPath = '/card_details';

    var connectorAuthUrl = localServer + connectorChargePath + chargeId + '/cards';
    var connectorCaptureUrl = localServer + connectorChargePath + chargeId + '/capture';

    var connectorMock = nock(localServer);

    function init_connector_url() {
        process.env.CONNECTOR_URL = localServer + connectorChargePath + '{chargeId}';
    }

    function connector_responds_with(charge) {
        connectorMock.get(connectorChargePath + chargeId).reply(200, charge);
    }

    function default_connector_response_for_get_charge(status) {
        init_connector_url();
        var serviceUrl = 'http://www.example.com/service';
        connector_responds_with({
            'amount': 2345,
            'status': status,
            'service_url': serviceUrl,
            'links': [{
                'href': connectorAuthUrl,
                'rel': 'cardAuth',
                'method': 'POST'
            }, {
                'href': connectorCaptureUrl,
                'rel': 'cardCapture',
                'method': 'POST'
            }]
        });
    }

    function get_charge_request(cookieValue, chargeId) {
        return request(app)
            .get(frontendCardDetailsPath + '/' + chargeId)
            .set('Cookie', ['session_state=' + cookieValue])
            .set('Accept', 'application/json');
    }

    describe('The /card_details endpoint', function () {
        var card_details_not_allowed_statuses = [
            'AUTHORISATION SUBMITTED',
            'AUTHORISATION SUCCESS',
            'AUTHORISATION REJECTED',
            'READY_FOR_CAPTURE',
            'AUTHORISATION SUBMITTED',
            'SYSTEM ERROR',
            'SYSTEM CANCELLED',
            'CAPTURED'
        ];


        card_details_not_allowed_statuses.forEach(function (status) {
            it('should error when the payment status is '+ status, function (done) {

                var cookieValue = cookie.create(chargeId);
                default_connector_response_for_get_charge(status);

                get_charge_request(cookieValue, chargeId)
                    .expect(404, {
                        'message': 'Page cannot be found'
                    }).end(done);
            });
        });
    });

    describe('The /confirm endpoint', function () {
        var confirm_not_allowed_statuses = [
            'AUTHORISATION SUBMITTED',
            'CREATED',
            'AUTHORISATION REJECTED',
            'READY_FOR_CAPTURE',
            'AUTHORISATION SUBMITTED',
            'SYSTEM ERROR',
            'SYSTEM CANCELLED',
            'CAPTURED'
        ];


        confirm_not_allowed_statuses.forEach(function (status) {

            var fullSessionData = {
                'amount': 1000,
                'cardNumber': "************5100",
                'expiryDate': "11/99",
                'cardholderName': 'T Eulenspiegel',
                'address': 'Kneitlingen, Brunswick, Germany',
                'serviceName': 'Pranks incorporated'
            };

            it('should error when the payment status is '+ status, function (done) {

                default_connector_response_for_get_charge(status);
                request(app)
                    .get(frontendCardDetailsPath + '/' + chargeId + '/confirm')
                    .set('Cookie', ['session_state=' + cookie.create(chargeId, fullSessionData)])
                    .set('Accept', 'application/json')
                    .expect(404, {
                        'message': 'Page cannot be found'
                    }).end(done);
            });
        });
    });
});
