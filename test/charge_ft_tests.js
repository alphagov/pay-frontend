var request = require('supertest');
var portfinder = require('portfinder');
var nock = require('nock');
var app = require(__dirname + '/../server.js').getApp;

portfinder.getPort(function(err, connectorPort) {

  var chargePath = '/v1/api/charge/';
  var chargeId = '23144323';

  process.env.CONNECTOR_URL = 'http://localhost:' + connectorPort + chargePath + '{chargeId}';
  var connectorMock = nock('http://localhost:' + connectorPort);

  describe('The charge endpoint', function () {
    it('should include the data required for the frontend', function(done) {
      var serviceUrl = 'http://www.example.com/service'
      var cardAuthUrl = 'http://connector.service/charge/a_charge/auth'

      connectorMock
        .get(chargePath + chargeId)
        .reply(200, {
          'amount': 2345,
          'service_url': serviceUrl,
          'links': [
            { 'href': cardAuthUrl, 'rel': 'cardAuth', 'method': 'POST' }
          ]
        });

      request(app)
        .get('/charge/' + chargeId)
        .set('Accept', 'application/json')
        .expect(200, {
                'amount': "23.45",
                'service_url': serviceUrl,
                'card_auth_url': cardAuthUrl
              }, done);
    });
  });
});
