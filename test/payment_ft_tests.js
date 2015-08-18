var request = require('supertest');
var should = require('chai').should();
var cheerio = require('cheerio');
var portfinder = require('portfinder');

var nock = require('nock');

portfinder.getPort(function(err, connectorPort) {
  process.env.CONNECTOR_URL="http://localhost:" + connectorPort + "/v1/info/charge/{chargeId}"
  var app = require(__dirname + '/../server.js').getApp;
  var connectorMock = nock('http://localhost:' + connectorPort);

  describe('The /charge', function () {
    it('should include the amount of the charge', function(done) {
      connectorMock
        .get('/v1/info/charge/CHARGEID')
        .reply(200, {
          'amount': 2344
        });

      request(app)
        .get('/charge/CHARGEID')
        .set('Accept', 'application/json')
        .expect(200)
        .end(function(err, res) {
          response = JSON.parse(res.text);
          response.amount.should.equal('23.44');
          done();
        });
    });
  });
});
