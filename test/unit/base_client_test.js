'use strict'

// NPM dependencies
const nock = require('nock')
const path = require('path')
const assert = require('assert')

// Local dependencies
const baseClient = require(path.join(__dirname, '/../../app/services/clients/base_client/base_client'))

// Constants
const url = 'http://www.example.com:65535'
const arbitraryRequestData = { foo: 'bar' }
const arbitraryCorrelationId = 123
const arbitraryResponseData = { response: 'I am a response' }

describe('base client', () => {
  beforeEach(function () {
    nock.cleanAll()
  })

  afterEach(function () {
    nock.cleanAll()
  })

  it('should add host header', (done) => {
    nock(url, {
      reqheaders: {
        'host': 'www.example.com:65535'
      }
    }).post('/', arbitraryRequestData)
      .reply(200)

    // literally just making sure data is passed to mocked service correctly
    baseClient.post(url, {
      payload: arbitraryRequestData,
      correlationId: arbitraryCorrelationId
    }, null, null).then(() => {
      done()
    })
  })

  it('should add host header without port', (done) => {
    const urlWithoutPort = 'http://www.example.com'
    nock(urlWithoutPort, {
      reqheaders: {
        'host': 'www.example.com'
      }
    }).post('/', arbitraryRequestData)
      .reply(200)

    // literally just making sure data is passed to mocked service correctly
    baseClient.post(urlWithoutPort, {
      payload: arbitraryRequestData,
      correlationId: arbitraryCorrelationId
    }, null, null).then(() => done())
  })

  it('should post data correctly', (done) => {
    nock(url)
      .post('/', arbitraryRequestData)
      .reply(200)

    // literally just making sure data is passed to mocked service correctly
    baseClient.post(url, {
      payload: arbitraryRequestData,
      correlationId: arbitraryCorrelationId
    }, null, null).then(() => done())
  })

  it('should put data correctly', (done) => {
    nock(url)
      .put('/', arbitraryRequestData)
      .reply(200)

    baseClient.put(url, {
      payload: arbitraryRequestData,
      correlationId: arbitraryCorrelationId
    }, null, null).then(() => done())
  })

  it('should patch data correctly', (done) => {
    nock(url)
      .patch('/', arbitraryRequestData)
      .reply(200)

    baseClient.patch(url, {
      payload: arbitraryRequestData,
      correlationId: arbitraryCorrelationId
    }, null, null).then(() => done())
  })

  it('should get correctly', (done) => {
    nock(url)
      .get('/')
      .reply(200, arbitraryResponseData)

    baseClient.get(url, { correlationId: arbitraryCorrelationId }, null, null).then(response => {
      assert.strict.equal(response.body.response, 'I am a response')
      done()
    })
  })

  it('should pass status code correctly to callback', (done) => {
    nock(url)
      .get('/')
      .reply(201, '{}')

    baseClient.get(url, { correlationId: arbitraryCorrelationId }, null, null).then(response => {
      assert.strict.equal(response.statusCode, 201)
      done()
    })
  })

  it('should pass response data to callback', (done) => {
    nock(url)
      .post('/', arbitraryRequestData)
      .reply(200, arbitraryResponseData)

    baseClient.post(url, { payload: arbitraryRequestData, correlationId: '123' }, null, null).then(response => {
      assert.strict.equal(response.body.response, 'I am a response')
      done()
    })
  })

  it('should call callback with null when there is no data', (done) => {
    nock(url)
      .post('/', arbitraryRequestData)
      .reply(200)

    baseClient.post(url, { payload: arbitraryRequestData, correlationId: '123' }, null, null).then(response => {
      assert.strict.equal(response.body, null)
      done()
    })
  })

  it('should set x-request-id header correctly', (done) => {
    nock(url)
      .get('/')
      .reply('{}')

    baseClient.get(url, { correlationId: 'reee' }, null, null).then(response => {
      assert.strict.equal(response.request.headers['x-request-id'], 'reee')
      done()
    })
  })

  it('should always set request content-type header to application/json', (done) => {
    nock(url)
      .get('/')
      .reply('{}')

    baseClient.get(url, {}, null, null).then(response => {
      assert.strict.equal(response.request.headers['Content-Type'], 'application/json')
      done()
    })
  })

  it('should ignore response content-type header and assume JSON', (done) => {
    nock(url)
      .get('/')
      .reply(200, arbitraryResponseData, { 'content-type': 'text/html' })

    baseClient.get(url, { correlationId: arbitraryCorrelationId }, null, null).then(response => {
      assert.strict.equal(response.body.response, 'I am a response')
      done()
    })
  })
})
