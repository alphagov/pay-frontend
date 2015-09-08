var request = require('supertest');
var portfinder = require('portfinder');
var nock = require('nock');
var app = require(__dirname + '/../server.js').getApp;

portfinder.getPort(function(err, connectorPort) {
  var localServer = 'http://localhost:' + connectorPort;

  var connectorChargePath = '/v1/api/charge/';
  var frontendChargePath = '/charge';
  var chargeId = '23144323';

  var connectorAuthUrl = localServer + connectorChargePath + chargeId +  '/cards';

  process.env.CONNECTOR_URL = localServer + connectorChargePath + '{chargeId}';
  var connectorMock = nock(localServer);

  describe('The /charge endpoint', function() {
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
        .get(frontendChargePath + '/' + chargeId)
        .set('Accept', 'application/json')
        .expect(200, {
          'amount' : '23.45',
          'service_url' : serviceUrl,
          'card_auth_url' : connectorAuthUrl,
          'post_card_action' : frontendChargePath,
          'charge_id' : chargeId
        }, done);
    });

    it('should send clean card data to connector', function(done) {
      connectorMock.post(connectorChargePath + chargeId + '/cards', {
        'card_number' : '5105105105105100',
        'cvc' : '234',
        'expiry_date' : '11/99'
      }).reply(204);

      request(app)
        .post(frontendChargePath)
        .send({
          'cardUrl': connectorAuthUrl,
          'chargeId': chargeId,
          'cardNo': '5105 1051 0510 5100',
          'cvc': '234',
          'expiryDate': '11/99'
        })
        .expect('Location', frontendChargePath + '/' + chargeId + '/confirm')
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
        .post(frontendChargePath)
        .send({
          'cardUrl': connectorAuthUrl,
          'chargeId': chargeId,
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
