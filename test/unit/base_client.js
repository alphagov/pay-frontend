const nock = require("nock");
const should = require('chai').should();
const assert = require('assert');

var baseClient = require(__dirname + "/../../app/utils/base_client");

const url = "http://www.example.com:65535";

describe("base client", () => {
  beforeEach(function() {
    nock.cleanAll();
  });

  afterEach(function() {
    nock.cleanAll();
  });

  it("should post data correctly", (done) => {
    nock(url)
      .post('/', {foo: 'bar', baz: ['a', '1']})
      .reply('{}');

    // literally just making sure data is passed to mocked service correctly
    baseClient.post(url, {data: {foo: 'bar', baz: ['a', '1']}, correlationId: '123'}, done);
  });

  it("should put data correctly", (done) => {
    nock(url)
      .put('/', {foo: 'bar', baz: ['a', '1']})
      .reply('{}');

    baseClient.put(url, {data: {foo: 'bar', baz: ['a', '1']}, correlationId: '123'}, done);
  });

  it("should patch data correctly", (done) => {
    nock(url)
      .patch('/', {foo: 'bar', baz: ['a', '1']})
      .reply('{}');

    baseClient.patch(url, {data: {foo: 'bar', baz: ['a', '1']}, correlationId: '123'}, done);
  });

  it("should get correctly", (done) => {
    nock(url)
      .get('/')
      .reply(201, {foo: 'bar'});

    baseClient.get(url, {correlationId: '123'}, (data) => {
      assert.equal(data.foo, 'bar');
      done();
    });
  });

  it("should pass status code correctly to callback", (done) => {
    nock(url)
      .get('/')
      .reply(201, '{}');

    baseClient.get(url, {correlationId: '123'}, (data, res) => {
      assert.equal(res.statusCode, 201);
      done();
    });
  });

  it('should call callback with data when there is data', (done) => {
    nock(url)
      .post('/', {foo: 'bar', baz: ['a', '1']})
      .reply(200, {"response": 'I am a response'});

    baseClient.post(url, {data: {foo: 'bar', baz: ['a', '1']}, correlationId: '123'}, (data) => {
      assert.equal(data.response, "I am a response");
      done();
    });
  });

  it('should call callback with null when there is no data', (done) => {
    nock(url)
      .post('/', {foo: 'bar'})
      .reply(200);

    baseClient.post(url, {data: {foo: 'bar', baz: ['a', '1']}, correlationId: '123'}, (data) => {
      assert.equal(data, null);
      done();
    });
  });

  it("should handle non JSON response gracefully", (done) => {
    nock(url)
      .get('/')
      .reply('<html></html>');

    baseClient.get(url, {correlationId: 'reee'}, (data) => {
      assert.equal(data, null);
      done();
    })
  });

  it("should always make keep-alive connections", (done) => {
    nock(url)
      .get('/')
      .reply('{}');

    let req = baseClient.get(url, {correlationId: 'reee'}, done);

    assert.equal(req.shouldKeepAlive, true);
  });

  it("should set x-request-id header correctly", (done) => {
    nock(url)
      .get('/')
      .reply('{}');

    let req = baseClient.get(url, {correlationId: 'reee'}, done);

    assert.equal(req.headers['x-request-id'], 'reee');
  });

  it("should always set content-type header to application/json", (done) => {
    nock(url)
      .get('/')
      .reply('{}');

    let req = baseClient.get(url, {}, done);

    assert.equal(req.headers['content-type'], 'application/json');
  });
});
