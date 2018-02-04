'use strict'

// npm dependencies
const {expect} = require('chai')
const proxyquire = require('proxyquire').noPreserveCache()

describe('frontend cookie', function () {
  let initialEnvironmentVariables
  before(() => {
    initialEnvironmentVariables = Object.assign({}, process.env)
  })

  afterEach(() => {
    for (const envVar in process.env) {
      process.env[envVar] = initialEnvironmentVariables[envVar]
    }
  })
  it('should have secure proxy off in unsecured environment', function () {
    process.env.SECURE_COOKIE_OFF = 'true'
    const cookies = proxyquire('../../app/utils/cookies.js', {})
    expect(cookies.getSessionCookieName()).to.equal('frontend_state')
    expect(cookies.namedCookie('name', 'key').proxy).to.equal(true)
    expect(cookies.namedCookie('name', 'key').cookie).to.deep.equal({httpOnly: true, secureProxy: false, maxAge: 5400000})
  })

  it('should have secure proxy on in a secured https environment', function () {
    process.env.SECURE_COOKIE_OFF = 'false'
    const cookies = proxyquire('../../app/utils/cookies.js', {})
    expect(cookies.getSessionCookieName()).to.equal('frontend_state')
    expect(cookies.namedCookie('name', 'key').proxy).to.equal(true)
    expect(cookies.namedCookie('name', 'key').cookie).to.deep.equal({httpOnly: true, secureProxy: true, maxAge: 5400000})
  })
})
