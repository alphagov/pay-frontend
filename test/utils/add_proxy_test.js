'use strict'

// NPM dependencies
const { expect } = require('chai')
const urlParse = require('url').parse
const proxyquire = require('proxyquire').noPreserveCache()

describe('add proxy test', () => {
  describe('with FORWARD_PROXY_URL env var', () => {
    it('url should be proxied with new hostname and port', () => {
      const forwardProxy = urlParse('http://forward-proxy:8888')
      process.env.FORWARD_PROXY_URL = forwardProxy.href
      const addProxy = proxyquire('../../app/utils/add_proxy', {})

      const proxiedUrl = addProxy.addProxy(urlParse('http://localhost:8080'))
      expect(proxiedUrl.hostname).to.equal(forwardProxy.hostname)
      expect(proxiedUrl.port).to.equal(forwardProxy.port)
      expect(proxiedUrl.protocol).to.equal(forwardProxy.protocol)
    })
  })

  describe('without FORWARD_PROXY_URL env var', () => {
    it('return url should be identical', () => {
      delete process.env.FORWARD_PROXY_URL
      const addProxy = proxyquire('../../app/utils/add_proxy', {})

      const url = urlParse('http://localhost:8080')
      expect(addProxy.addProxy(url)).to.equal(url)
    })
  })
}
)
