var request = require('supertest');
var should = require('chai').should();
var cheerio = require('cheerio');

module.exports = {
  response_to: function (app, endpoint) {

    return {
      contains: function(expectedResponse) {
        return function(done) {
          request(app)
            .get(endpoint)
            .set('Accept', 'application/json')
            .expect(200)
            .end(function(err, res) {
              response = JSON.parse(res.text);
              Object.keys(expectedResponse).map(function(key){
                expectedResponse[key].should.equal(response[key]);
              });
              done();
            });
        }
      }
    }
  }
};
