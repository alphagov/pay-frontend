process.env.SESSION_ENCRYPTION_KEY = 'naskjwefvwei72rjkwfmjwfi72rfkjwefmjwefiuwefjkbwfiu24fmjbwfk';

var request = require('supertest');
var portfinder = require('portfinder');
var nock = require('nock');
var app = require(__dirname + '/../server.js').getApp;
var clientSessions = require("client-sessions");

portfinder.getPort(function(err, connectorPort) {
  describe('The /card_details endpoint', function() {
    var localServer = 'http://localhost:' + connectorPort;

    var connectorChargePath = '/v1/api/charge/';
    var frontendCardDetailsPath = '/card_details';
    var chargeId = '23144323';

    var connectorAuthUrl = localServer + connectorChargePath + chargeId +  '/cards';

    var connectorMock = nock(localServer);

    process.env.CONNECTOR_URL = localServer + connectorChargePath + '{chargeId}';

    var cookieValue = clientSessions.util.encode(
      {
        'cookieName': 'session_state',
        'secret':     process.env.SESSION_ENCRYPTION_KEY
      },
      {
        'chargeId'   : chargeId,
        'cardAuthUrl': connectorAuthUrl
      }
    );

    it('should include the data required for the frontend', function(done) {
      var serviceUrl = 'http://www.example.com/service';

      connectorMock.get(connectorChargePath + chargeId).reply(200, {
        'amount' : 2345,
        'service_url' : serviceUrl,
        'links' : [ {
          'href' : connectorAuthUrl,
          'rel' : 'cardAuth',
          'method' : 'POST'
        } ]
      });

      request(app)
        .get(frontendCardDetailsPath)
        .set('Cookie', ['session_state='+cookieValue])
        .set('Accept', 'application/json')
        .expect(200, {
          'amount' : '23.45',
          'service_url' : serviceUrl,
          'post_card_action' : frontendCardDetailsPath
        }, done);
    });

    it('should send clean card data to connector', function(done) {
      connectorMock.post(connectorChargePath + chargeId + '/cards', {
        'card_number' : '5105105105105100',
        'cvc' : '234',
        'expiry_date' : '11/99'
      }).reply(204);

      request(app)
        .post(frontendCardDetailsPath)
        .set('Cookie', ['session_state='+cookieValue])
        .send({
          'cardNo': '5105 1051 0510 5100',
          'cvc': '234',
          'expiryDate': '11/99'
        })
        .expect('Location', frontendCardDetailsPath + '/' + chargeId + '/confirm')
        .expect(303)
        .end(done);
    });

    it('show an error page when authorization was refused', function(done) {
      connectorMock.post(connectorChargePath + chargeId + '/cards', {
        'card_number' : '5105105105105100',
        'cvc' : '234',
        'expiry_date' : '11/99'
      }).reply(400, { 'message': 'This transaction was declined.' });

      request(app)
        .post(frontendCardDetailsPath)
        .set('Cookie', ['session_state='+cookieValue])
        .send({
          'cardNo': '5105 1051 0510 5100',
          'cvc': '234',
          'expiryDate': '11/99'
        })
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Accept', 'application/json')
        .expect(200, {
          'message' : 'Payment could not be processed, please contact your issuing bank'
        }, done);
    });
  });
});
