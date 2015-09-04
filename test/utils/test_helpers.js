var request = require('supertest');
var should = require('chai').should();
var cheerio = require('cheerio');

module.exports = {

  get: function (app, endpoint) {
    return {
      is: function(responseCode) {
        return {
          contains: function(expectedResponse) {
            return function(done) {
              request(app)
                .get(endpoint)
                .set('Accept', 'application/json')
                .expect(responseCode)
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
    }
  },

  post: function(app, endpoint) {
    return {
      withData: function(payload) {
        return {
          is: function(responseCode) {
            return {
              location: function(location) {
                return function(done) {
                  request(app)
                    .post(endpoint)
                    .set('Accept', 'application/json')
                    .send(payload)
                    .expect('Location', location)
                    .expect(responseCode)
                    .end(done);
                }
              },

              contains: function(expectedResponse) {
                return function(done) {
                  request(app)
                    .post(endpoint)
                    .set('Accept', 'application/json')
                    .send(payload)
                    .expect(responseCode)
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
        }
      }
    }
  }
};
