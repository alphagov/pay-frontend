process.env.SESSION_ENCRYPTION_KEY = 'naskjwefvwei72rjkwfmjwfi72rfkjwefmjwefiuwefjkbwfiu24fmjbwfk';

var request = require('supertest');
var portfinder = require('portfinder');
var nock = require('nock');
var app = require(__dirname + '/../server.js').getApp;
var should = require('chai').should();

var cookie = require(__dirname + '/utils/session.js');

portfinder.getPort(function(err, connectorPort) {
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

    function default_connector_response_for_get_charge(state) {
        init_connector_url();
        var serviceUrl = 'http://www.example.com/service';
        connector_responds_with({
            'amount': 2345,
            'state' : state,
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

    describe('The /card_details endpoint', function() {
        it('should fail when the payment state is not ENTERING_CARD_DETAILS', function (done) {
            var serviceUrl = 'http://www.example.com/service';

            var cookieValue = cookie.create(chargeId);
            default_connector_response_for_get_charge('AUTHORISATION SUBMITTED');

            get_charge_request(cookieValue, chargeId)
                .expect(404, {
                    'message': 'Page cannot be found'
                }).end(done);
        });
    });
});
