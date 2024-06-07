'use strict'

const sinon = require('sinon')
const proxyquire = require('proxyquire')

const loggingSpy = sinon.spy()
const res = {
  sendStatus: sinon.spy()
}

const clientSideLoggingController = proxyquire('../../app/controllers/client-side-logging.controller', {
  '../utils/logger': () => ({
    info: loggingSpy
  })
})

describe.only('The client-side logging controller', () => {
  beforeEach(() => {
    loggingSpy.resetHistory()
  })

  it('Should log expected message and return 200 for valid code', () => {
    const req = {
      body: {
        code: 'ApplePayAvailable'
      }
    }
    clientSideLoggingController.log(req, res)
    sinon.assert.calledWith(loggingSpy, 'Apple Pay is available on this device')
    sinon.assert.calledWith(res.sendStatus, 200)
  })

  it('Should log error message and return 200 for invalid code', () => {
    const req = {
      body: {
        code: 'FOO'
      }
    }
    clientSideLoggingController.log(req, res)
    sinon.assert.calledWith(loggingSpy, 'Client side logging endpoint called with invalid log code')
    sinon.assert.calledWith(res.sendStatus, 200)
  })

  it('Should log error message and return 200 for no code', () => {
    const req = {
      body: {
      }
    }
    clientSideLoggingController.log(req, res)
    sinon.assert.calledWith(loggingSpy, 'Client side logging endpoint called with invalid log code')
    sinon.assert.calledWith(res.sendStatus, 200)
  })
})
