var request = require('supertest');
var should = require('chai').should();
var cheerio = require('cheerio');
var portfinder = require('portfinder');

var nock = require('nock');

portfinder.getPort(function(err, connectorPort) {
  process.env.CONNECTOR_URL="http://localhost:" + connectorPort + "/info/payment/{payId}"
  var app = require(__dirname + '/../server.js').getApp;
  var connectorMock = nock('http://localhost:' + connectorPort);

  describe('The /payment', function () {
    it('should include the amount of the payment', function(done) {
      connectorMock
        .get('/info/payment/PAYID')
        .reply(200, {
          'amount': 2344
        });

      request(app)
        .get('/payment/PAYID')
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
