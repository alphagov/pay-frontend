'use strict'

// npm dependencies
const {expect} = require('chai')

// local dependencies
const abTest = require('../../app/utils/ab_test')

describe('ab test helper', function () {
  it('should uniformly generate a random number', () => {
    const uniformModNumber = abTest.uniformlyGeneratedRandomNumber()
    expect(uniformModNumber).to.not.be.null  // eslint-disable-line
  })
  it('should GET a session', () => {
    const req = {frontend_state: {abTestId: 12345}}
    const sessionVal = abTest._getSession(req)
    expect(sessionVal).to.equal(req.frontend_state.abTestId)
  })
  it('should SET a session', () => {
    const req = {frontend_state: {}}
    abTest._setSession(req)
    expect(req.frontend_state.abTestId).to.not.be.undefined  // eslint-disable-line
  })
  it('should GET or SET a session', () => {
    const req = {frontend_state: {}}
    abTest._getOrSetSession(req)
    expect(req.frontend_state.abTestId).to.not.be.undefined  // eslint-disable-line
  })
  it('should switch to a default variant, when the right conditions are in place', () => {
    const req = {frontend_state: {}, query: {abTestNotHere: true}}
    const opts = {
      threshold: 100,
      defaultVariant: function () {
        return 'defaultVariant'
      },
      testingVariant: function () {
        return 'testingVariant'
      }

    }
    const switchMiddleware = abTest.switch(opts)
    const switchResult = switchMiddleware(req, null)
    expect(switchResult).to.equal('defaultVariant')
  })
  it('should switch to a testing variant, when the right conditions are in place', () => {
    const req = {frontend_state: {}, query: {abTest: 'yes'}}
    const opts = {
      defaultVariant: function () {
        return 'defaultVariant'
      },
      testingVariant: function () {
        return 'testingVariant'
      }

    }
    const switchMiddleware = abTest.switch(opts)
    const switchResult = switchMiddleware(req, null)
    expect(switchResult).to.equal('testingVariant')
  })
}
)
