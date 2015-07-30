var request = require('supertest');
var should = require('chai').should();
var cheerio = require('cheerio');
var renderer = require(__dirname + '/utils/renderer.js').renderer;

var app = require(__dirname + '/../server.js').getApp;

describe('Greeting endpoint', function () {

  it('[IT] should return greeting and name attributes', function (done) {
    request(app)
    	.get('/greeting')
      .set('Accept', 'application/json')
    	.expect(200)
    	.end(function(err, res) {
      	response = JSON.parse(res.text);
        response.greeting.should.equal('Hello');
        response.name.should.equal('World');
      	done();
    	});
  });

  it('[UI] should render both variables in a paragraph', function (done) {
    var templateData = {'greeting': 'Hello', 'name': 'World'};
    renderer('greeting', templateData, function(htmlOutput) {
      $ = cheerio.load(htmlOutput);
      $('#greeting').text().should.equal('Hello World');
      done();
    });
  });

});
