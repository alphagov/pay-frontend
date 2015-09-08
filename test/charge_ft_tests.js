var request = require('supertest');
var portfinder = require('portfinder');
var nock = require('nock');
var app = require(__dirname + '/../server.js').getApp;
var getTo = require(__dirname + '/utils/test_helpers.js').get;
var postTo = require(__dirname + '/utils/test_helpers.js').post;

portfinder.getPort(function(err, connectorPort) {
  var localServer = 'http://localhost:' + connectorPort;

  var connectorChargePath = '/v1/api/charge/';
  var frontendChargePath = '/charge';
  var chargeId = '23144323';

  var connectorAuthUrl = localServer + connectorChargePath + chargeId +  '/cards';

  process.env.CONNECTOR_URL = localServer + connectorChargePath + '{chargeId}';
  var connectorMock = nock(localServer);

  describe('The /charge endpoint', function() {

    describe('together with a successful connector mock for GET /v1/api/charge/23144323', function() {

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

      it('should return the data required for the frontend',

        getTo(app, frontendChargePath + '/' + chargeId)
          .is(200)
          .contains({
              'amount' : '23.45',
              'service_url' : serviceUrl,
              'card_auth_url' : connectorAuthUrl,
              'post_card_action' : frontendChargePath,
              'charge_id' : chargeId
            })
      );
    });

    describe('together with a successful connector mock for POST /v1/api/charge/23144323', function() {

      connectorMock.post(connectorChargePath + chargeId + '/cards', {
        'card_number' : '5105105105105100',
        'cvc' : '234',
        'expiry_date' : '11/99'
       }).reply(204);

      it('should send clean card data to connector',

        postTo(app, frontendChargePath)
          .withData({
              'cardUrl': connectorAuthUrl,
              'chargeId': chargeId,
              'cardNo': '5105 1051 0510 5100',
              'cvc': '234',
              'expiryDate': '11/99'
            })
          .is(303)
          .location(frontendChargePath + '/' + chargeId + '/confirm')

      );
    });

    describe('together with a failing connector mock for POST /v1/api/charge/23144323', function() {

      connectorMock.post(connectorChargePath + chargeId + '/cards', {
        'card_number' : '5105105105105100',
        'cvc' : '234',
        'expiry_date' : '11/99'
      }).reply(400, { 'message': 'This transaction was declined.' });

      it('show an error page when authorization was refused',

        postTo(app, frontendChargePath)
          .withData({
            'cardUrl': connectorAuthUrl,
            'chargeId': chargeId,
            'cardNo': '5105 1051 0510 5100',
            'cvc': '234',
            'expiryDate': '11/99'
            })
          .is(200)
          .contains({
            'message' : 'Payment could not be processed, please contact your issuing bank'
          })

      );

    });

  });

});