var request = require('supertest');
var portfinder = require('portfinder');
var nock = require('nock');
var assert = require('chai').assert;
var app = require(__dirname + '/../server.js').getApp;
var cookie = require(__dirname + '/utils/session.js');

describe('dummy feature - trigger', function() {
  portfinder.getPort(function(err, connectorPort) {
    describe('The secure /charge endpoint', function() {
      beforeEach(function() {
        nock.cleanAll();
      });
      var localServer = 'http://localhost:' + connectorPort;

      var connectorTokenPath = '/v1/api/tokens/';

      var frontendChargePath = '/charge';
      var chargeId = '23144323';
      var chargeTokenId = 'asdnwnbwkk';

      it('should successfully verify the chargeTokenId', function(done) {
        process.env.CONNECTOR_TOKEN_URL = localServer + connectorTokenPath + '{chargeTokenId}';
        var connectorMock = nock(localServer);

        connectorMock.get(connectorTokenPath + chargeTokenId).reply(200, {
          'chargeId' : chargeId
        });

        connectorMock.delete(connectorTokenPath + chargeTokenId).reply(204);

        var frontendCardDetailsPath = '/card_details';

        request(app)
          .get(frontendChargePath + '/' + chargeId + '?chargeTokenId=' + chargeTokenId)
          .set('Accept', 'application/json')
          .expect('Location', frontendCardDetailsPath + '/' + chargeId)
          .expect(303)
          .expect(function(res) {
            var decoded_session = cookie.decrypt(res, chargeId);
            assert.deepEqual({}, decoded_session);
          })
          .end(done);
      });

      it('should continue normally on a refresh or browser back button when chargeId is on the session', function(done) {
        process.env.CONNECTOR_TOKEN_URL = localServer + connectorTokenPath + '{chargeTokenId}';
        var connectorMock = nock(localServer);

        connectorMock.get(connectorTokenPath + chargeTokenId).reply(200, {
          'chargeId' : chargeId
        });

        var frontendCardDetailsPath = '/card_details';

        var cookieValue = cookie.create(chargeId);

        request(app)
          .get(frontendChargePath + '/' + chargeId + '?chargeTokenId=' + chargeTokenId)
          .set('Accept', 'application/json')
          .set('Cookie', ['session_state=' + cookieValue])
          .expect('Location', frontendCardDetailsPath + '/' + chargeId)
          .expect(303)
          .end(done);
      });

      it('should fail when there is an attempt to use a chargeTokenId that is not valid', function(done) {
        process.env.CONNECTOR_TOKEN_URL = localServer + connectorTokenPath + '{chargeTokenId}';

        var connectorMock = nock(localServer);

        connectorMock.get(connectorTokenPath + chargeTokenId).reply(404, {
          'message' : 'Token has expired!'
        });

        request(app)
          .get(frontendChargePath + '/' + chargeId + '?chargeTokenId=' + chargeTokenId)
          .set('Accept', 'application/json')
          .expect(400, done);
      });
    });
  });
});