var request = require('supertest');
var nock    = require('nock');
var assert  = require('chai').assert;
var app     = require(__dirname + '/../server.js').getApp;
var cookie  = require(__dirname + '/test_helpers/session.js');
var paths   = require(__dirname + '/../app/paths.js');


describe('The secure /charge endpoint', function() {
  beforeEach(function() {
    nock.cleanAll();
  });
  var localServer = process.env.CONNECTOR_HOST;

  var connectorTokenPath = '/v1/frontend/tokens/';

  var frontendChargePath = '/charge';
  var chargeId = '23144323';
  var chargeTokenId = 'asdnwnbwkk';
  // external hosts have the full url, not too sure the best way to fix this
  var tokenPath = paths.generateRoute(paths.connectorCharge.token.path,
    {chargeTokenId: chargeTokenId}).replace(localServer,"");


  it('should successfully verify the chargeTokenId', function(done) {
    var connectorMock = nock(localServer);
    connectorMock.get(tokenPath).reply(200, {
      'chargeId' : chargeId
    });

    connectorMock.delete(tokenPath).reply(204);

    var frontendCardDetailsPath = '/card_details';

    request(app)
      .get(frontendChargePath + '/' + chargeId + '?chargeTokenId=' + chargeTokenId)
      .set('Accept', 'application/json')
      .expect('Location', frontendCardDetailsPath + '/' + chargeId)
      .expect(303)
      .expect(function(res) {
        var decoded_session = cookie.decrypt(res, chargeId);
        assert.equal(true, decoded_session !== undefined);
      })
      .end(done);
  });

  it('should continue normally on a refresh or browser back button when chargeId is on the session', function(done) {
    var connectorMock = nock(localServer);

    connectorMock.get(tokenPath).reply(200, {
      'chargeId' : chargeId
    });

    var frontendCardDetailsPath = '/card_details';

    var cookieValue = cookie.create(chargeId);

    request(app)
      .get(frontendChargePath + '/' + chargeId + '?chargeTokenId=' + chargeTokenId)
      .set('Accept', 'application/json')
      .set('Cookie', ['frontend_state=' + cookieValue])
      .expect('Location', frontendCardDetailsPath + '/' + chargeId)
      .expect(303)
      .end(done);
  });

  it('should fail when there is an attempt to use a chargeTokenId that is not valid', function(done) {

    var connectorMock = nock(localServer);

    connectorMock.get(tokenPath).reply(404, {
      'message' : 'Token has expired!'
    });

    request(app)
      .get(frontendChargePath + '/' + chargeId + '?chargeTokenId=' + chargeTokenId)
      .set('Accept', 'application/json')
      .expect(400, done);
  });
});
