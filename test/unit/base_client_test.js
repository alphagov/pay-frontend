const nock = require('nock')
const path = require('path')

const assert = require('assert')

var baseClient = require(path.join(__dirname, '/../../app/utils/base_client2'))

const url = 'http://www.example.com:65535'
const arbitraryRequestData = {foo: 'bar'}
const arbitraryCorrelationId = 123
const arbitraryResponseData = {response: 'I am a response'}

describe('base client', () => {
  beforeEach(function () {
    nock.cleanAll()
  })

  afterEach(function () {
    nock.cleanAll()
  })

  it('should post data correctly', (done) => {
    nock(url)
      .post('/', arbitraryRequestData)
      .reply(200)

    // literally just making sure data is passed to mocked service correctly
    baseClient.post(url, {payload: arbitraryRequestData, correlationId: arbitraryCorrelationId}, done)
  })

  it('should put data correctly', (done) => {
    nock(url)
      .put('/', arbitraryRequestData)
      .reply(200)

    baseClient.put(url, {payload: arbitraryRequestData, correlationId: arbitraryCorrelationId}, done)
  })

  it('should patch data correctly', (done) => {
    nock(url)
      .patch('/', arbitraryRequestData)
      .reply(200)

    baseClient.patch(url, {payload: arbitraryRequestData, correlationId: arbitraryCorrelationId}, done)
  })

  it('should get correctly', (done) => {
    nock(url)
      .get('/')
      .reply(200, arbitraryResponseData)

    baseClient.get(url, {correlationId: arbitraryCorrelationId}, (err, data) => {
      if (err) {
        return done(err)
      }
      assert.equal(data.body.response, 'I am a response')
      done()
    })
  })

  it('should pass status code correctly to callback', (done) => {
    nock(url)
      .get('/')
      .reply(201, '{}')

    baseClient.get(url, {correlationId: arbitraryCorrelationId}, (err, data) => {
      if (err) {
        return done(err)
      }
      assert.equal(data.statusCode, 201)
      done()
    })
  })

  it('should pass response data to callback', (done) => {
    nock(url)
      .post('/', arbitraryRequestData)
      .reply(200, arbitraryResponseData)

    baseClient.post(url, {payload: arbitraryRequestData, correlationId: '123'}, (err, data) => {
      if (err) {
        return done(err)
      }
      assert.equal(data.body.response, 'I am a response')
      done()
    })
  })

  it('should call callback with null when there is no data', (done) => {
    nock(url)
      .post('/', arbitraryRequestData)
      .reply(200)

    baseClient.post(url, {payload: arbitraryRequestData, correlationId: '123'}, (err, data) => {
      if (err) {
        return done(err)
      }
      assert.equal(data.body, null)
      done()
    })
  })
  it('should always make keep-alive connections', (done) => {
    nock(url)
      .get('/')
      .reply('{}')

    let req = baseClient.get(url, {correlationId: 'reee'}, done)

    assert.equal(req.options.agent.keepAlive, true)
  })

  it('should set x-request-id header correctly', (done) => {
    nock(url)
      .get('/')
      .reply('{}')

    let req = baseClient.get(url, {correlationId: 'reee'}, done)

    assert.equal(req.options.headers['x-request-id'], 'reee')
  })

  // it('should always set request content-type header to application/json', (done) => {
  //   nock(url)
  //     .get('/')
  //     .reply('{}')
  //
  //   let req = baseClient.get(url, {}, done)
  //
  //   assert.equal(req.options.headers['content-type'], 'application/json')
  // })

  it('should ignore response content-type header and assume JSON', (done) => {
    nock(url)
      .get('/')
      .reply(200, arbitraryResponseData, {'content-type': 'text/html'})

    baseClient.get(url, {correlationId: arbitraryCorrelationId}, (err, data) => {
      if (err) {
        return done(err)
      }
      assert.equal(data.body.response, 'I am a response')
      done()
    })
  })
})
