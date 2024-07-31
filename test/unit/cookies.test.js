'use strict'

// NPM dependencies
const { expect } = require('chai')
const sinon = require('sinon')
const proxyquire = require('proxyquire').noPreserveCache()
const { createChargeIdSessionKey } = require('../../app/utils/session')
const { ChargeState, epochSecondsNow } = require('../../app/models/ChargeState')

const getCookiesUtil = clientSessionsStub => {
  if (clientSessionsStub) return proxyquire('../../app/utils/cookies', { 'client-sessions': clientSessionsStub })
  return proxyquire('../../app/utils/cookies', {})
}

describe('cookie configuration', function () {
  let initialEnvironmentVariables
  before(() => {
    initialEnvironmentVariables = Object.assign({}, process.env)
  })

  afterEach(() => {
    for (const envVar in process.env) {
      process.env[envVar] = initialEnvironmentVariables[envVar]
    }
  })
  it('should configure cookie correctly', function () {
    const app = {
      use: sinon.stub()
    }
    const clientSessionsStub = sinon.stub()
    const cookies = getCookiesUtil(clientSessionsStub)

    const expectedConfig = {
      cookieName: 'frontend_state',
      proxy: true,
      secret: 'naskjwefvwei72rjkwfmjwfi72rfkjwefmjwefiuwefjkbwfiu24fmjbwfk',
      cookie: {
        maxAge: 5400000,
        httpOnly: true,
        secureProxy: true
      }
    }

    cookies.configureSessionCookie(app)

    expect(clientSessionsStub.calledWith(expectedConfig)).to.equal(true)
  })
  it('should configure two cookies if two session keys are set', function () {
    const SESSION_ENCRYPTION_KEY_2 = process.env.SESSION_ENCRYPTION_KEY_2 = 'bobbobbobbob'
    const app = { use: sinon.spy() }
    const clientSessionsStub = sinon.stub()
    const cookies = getCookiesUtil(clientSessionsStub)

    const expectedConfig1 = {
      cookieName: 'frontend_state',
      proxy: true,
      secret: initialEnvironmentVariables.SESSION_ENCRYPTION_KEY,
      cookie: {
        maxAge: 5400000,
        httpOnly: true,
        secureProxy: true
      }
    }

    const expectedConfig2 = {
      cookieName: 'frontend_state_2',
      proxy: true,
      secret: SESSION_ENCRYPTION_KEY_2,
      cookie: {
        maxAge: 5400000,
        httpOnly: true,
        secureProxy: true
      }
    }

    cookies.configureSessionCookie(app)

    expect(clientSessionsStub.calledWith(expectedConfig1)).to.equal(true)
    expect(clientSessionsStub.calledWith(expectedConfig2)).to.equal(true)
    expect(clientSessionsStub.callCount).to.equal(2)
  })
  it('should configure two cookies if two session keys are set', function () {
    process.env.SESSION_ENCRYPTION_KEY_2 = ''
    const app = {
      use: sinon.spy()
    }
    const clientSessionsStub = sinon.stub()
    const cookies = getCookiesUtil(clientSessionsStub)

    const expectedConfig1 = {
      cookieName: 'frontend_state',
      proxy: true,
      secret: 'naskjwefvwei72rjkwfmjwfi72rfkjwefmjwefiuwefjkbwfiu24fmjbwfk',
      cookie: {
        maxAge: 5400000,
        httpOnly: true,
        secureProxy: true
      }
    }

    cookies.configureSessionCookie(app)

    expect(clientSessionsStub.calledWith(expectedConfig1)).to.equal(true)
    expect(clientSessionsStub.callCount).to.equal(1)
  })
  it('should throw an error if no session keys are set', function () {
    delete process.env.SESSION_ENCRYPTION_KEY_2
    process.env.SESSION_ENCRYPTION_KEY = ''

    const clientSessionsStub = sinon.stub()
    const cookies = getCookiesUtil(clientSessionsStub)

    expect(() => cookies.configureSessionCookie({})).to.throw(/cookie encryption key is not set/)
  })
  it('should throw an error if no valid session keys are set', function () {
    process.env.SESSION_ENCRYPTION_KEY_2 = 'asfdwv'
    process.env.SESSION_ENCRYPTION_KEY = ''

    const clientSessionsStub = sinon.stub()
    const cookies = getCookiesUtil(clientSessionsStub)

    expect(() => cookies.configureSessionCookie({})).to.throw(/cookie encryption key is not set/)
  })
})

describe('find session charge to delete', () => {
  let initialEnvironmentVariables
  const now = epochSecondsNow()
  const overTwentyFourHoursAgo = (now - 86400) - 120
  const ninetyFiveMinutesAgo = now - 5700
  const ninetyMinutesAgo = now - 5400
  const thirtyMinutesAgo = now - 1800
  const twentyMinutesAgo = now - 1200

  before(() => {
    initialEnvironmentVariables = Object.assign({}, process.env)
  })

  afterEach(() => {
    for (const envVar in process.env) {
      process.env[envVar] = initialEnvironmentVariables[envVar]
    }
  })

  // it returns earliest accessed charge that is older than 24 hours for deletion
  // OR
  // it returns the earliest accessed completed charge
  // OR
  // it returns earliest accessed charge that is older than ninety minutes
  // OR
  // it returns the earliest accessed charge

  it('should return the earliest accessed charge that is older than 24 hours', function () {
    const cookies = getCookiesUtil()

    const req = {
      frontend_state: {
        ch_1: {
          data: new ChargeState(ninetyMinutesAgo, (now), false).toString()
        },
        ch_2: {
          data: new ChargeState(ninetyMinutesAgo, (now - 5), true).toString()
        },
        ch_3: {
          data: new ChargeState(overTwentyFourHoursAgo, (now - 10), false).toString()
        },
        ch_4: {
          data: new ChargeState(overTwentyFourHoursAgo, (now - 20), false).toString()
        }
      }
    }

    const result = cookies.findSessionChargeToDelete(req)
    expect(result).to.equal('ch_4')
  })

  it('should return the earliest accessed completed charge', function () {
    const cookies = getCookiesUtil()

    const req = {
      frontend_state: {
        ch_1: {
          data: new ChargeState(thirtyMinutesAgo, (now), true).toString()
        },
        ch_2: {
          data: new ChargeState(ninetyFiveMinutesAgo, (now - 5), true).toString()
        },
        ch_3: {
          data: new ChargeState(thirtyMinutesAgo, (now - 30), true).toString()
        },
        ch_4: {
          data: new ChargeState(thirtyMinutesAgo, (now - 40), false).toString()
        }
      }
    }

    const result = cookies.findSessionChargeToDelete(req)
    expect(result).to.equal('ch_3')
  })

  it('should return the earliest accessed charge that is older than ninety minutes', function () {
    const cookies = getCookiesUtil()

    const req = {
      frontend_state: {
        ch_1: {
          data: new ChargeState(thirtyMinutesAgo, (now - 50), false).toString()
        },
        ch_2: {
          data: new ChargeState(ninetyFiveMinutesAgo, (now - 45), false).toString()
        },
        ch_3: {
          data: new ChargeState(ninetyFiveMinutesAgo, (now - 30), false).toString()
        },
        ch_4: {
          data: new ChargeState(ninetyFiveMinutesAgo, (now - 40), false).toString()
        }
      }
    }

    const result = cookies.findSessionChargeToDelete(req)
    expect(result).to.equal('ch_2')
  })

  it('should return the earliest accessed charge', function () {
    const cookies = getCookiesUtil()

    const req = {
      frontend_state: {
        ch_1: {
          data: new ChargeState(twentyMinutesAgo, (now - 50), false).toString()
        },
        ch_2: {
          data: new ChargeState(twentyMinutesAgo, (now - 45), false).toString()
        },
        ch_3: {
          data: new ChargeState(twentyMinutesAgo, (now - 30), false).toString()
        },
        ch_4: {
          data: new ChargeState(twentyMinutesAgo, (now - 40), false).toString()
        }
      }
    }

    const result = cookies.findSessionChargeToDelete(req)
    expect(result).to.equal('ch_1')
  })
})

describe('setting value on session', function () {
  let initialEnvironmentVariables
  before(() => {
    initialEnvironmentVariables = Object.assign({}, process.env)
  })

  afterEach(() => {
    for (const envVar in process.env) {
      process.env[envVar] = initialEnvironmentVariables[envVar]
    }
  })
  it('should set value on frontend_state if SESSION_ENCRYPTION_KEY set', function () {
    const cookies = getCookiesUtil()
    const req = {
      frontend_state: {}
    }

    cookies.setSessionVariable(req, 'foo', 'bar')

    expect(req.frontend_state.foo).to.equal('bar')
  })

  it('should set object on frontend_state and add to it not replace it', function () {
    const cookies = getCookiesUtil()
    const req = {
      frontend_state: {}
    }

    cookies.setSessionVariable(req, 'foo', { a: 'f' })
    cookies.setSessionVariable(req, 'foo', { b: 'o' })

    expect(req.frontend_state.foo).to.deep.equal({ a: 'f', b: 'o' })
  })

  it('should set value on frontend_state_2 if SESSION_ENCRYPTION_KEY_2 set', function () {
    const originalKey = process.env.SESSION_ENCRYPTION_KEY
    process.env.SESSION_ENCRYPTION_KEY = ''

    process.env.SESSION_ENCRYPTION_KEY_2 = 'key2key2key2key2'

    const cookies = getCookiesUtil()
    const req = {
      frontend_state_2: {}
    }

    cookies.setSessionVariable(req, 'foo', 'baz')

    expect(req.frontend_state_2.foo).to.equal('baz')

    process.env.SESSION_ENCRYPTION_KEY = originalKey

    delete process.env.SESSION_ENCRYPTION_KEY_2
  })

  it('should set values on frontend_state and frontend_state_2 if both keys set', function () {
    process.env.SESSION_ENCRYPTION_KEY_2 = 'key2key2key2key2'

    const cookies = getCookiesUtil()
    const req = {
      frontend_state: {},
      frontend_state_2: {}
    }

    cookies.setSessionVariable(req, 'foo', 'baz')

    expect(req.frontend_state.foo).to.equal('baz')
    expect(req.frontend_state_2.foo).to.equal('baz')

    delete process.env.SESSION_ENCRYPTION_KEY_2
  })

  it('does not try to set value on non-existent cookie', function () {
    const cookies = getCookiesUtil()
    const req = {}

    cookies.setSessionVariable(req, 'foo', 'bar')

    expect(req).to.deep.equal({})
  })
})

describe('getting value from session', function () {
  it('should get value on frontend_state if only SESSION_ENCRYPTION_KEY set', function () {
    const cookies = getCookiesUtil()
    const req = {
      frontend_state: {
        foo: 'bar'
      }
    }

    expect(cookies.getSessionVariable(req, 'foo')).to.equal('bar')
  })

  it('should get value on frontend_state_2 if only SESSION_ENCRYPTION_KEY_2 set', function () {
    const originalKey = process.env.SESSION_ENCRYPTION_KEY
    delete process.env.SESSION_ENCRYPTION_KEY

    process.env.SESSION_ENCRYPTION_KEY_2 = 'key2key2key2key2'

    const cookies = getCookiesUtil()
    const req = {
      frontend_state_2: {
        foo: 'baz'
      }
    }

    expect(cookies.getSessionVariable(req, 'foo')).to.equal('baz')

    process.env.SESSION_ENCRYPTION_KEY = originalKey
    delete process.env.SESSION_ENCRYPTION_KEY_2
  })

  it('should get value from frontend_state if both keys set', function () {
    process.env.SESSION_ENCRYPTION_KEY_2 = 'key2key2key2key2key'

    const cookies = getCookiesUtil()
    const req = {
      frontend_state: {
        foo: 'bar'
      },
      frontend_state_2: {
        foo: 'baz'
      }
    }

    expect(cookies.getSessionVariable(req, 'foo')).to.equal('bar')

    delete process.env.SESSION_ENCRYPTION_KEY_2
  })

  it('should return charge keys for session where data object exists', () => {
    const cookies = getCookiesUtil()
    const req = {
      frontend_state: {
        ch_1: {
          data: 'blah'
        },
        ch_2: {
          data: 'blah'
        },
        ch_3: {
          data: 'blah'
        },
        ch_4: {
          data: 'blah'
        },
        ch_5: {
          notDataObj: 'blah'
        }
      }
    }
    expect(cookies.getChargesOnSession(req)).to.deep.equal(['ch_1', 'ch_2', 'ch_3', 'ch_4'])
    expect(cookies.getChargesOnSession(req).length).to.equal(4)
  })
})

describe('removing value from session', function () {
  it('should remove value from frontend_state', function () {
    process.env.SESSION_ENCRYPTION_KEY = 'key1key1key1key1'
    process.env.SESSION_ENCRYPTION_KEY_2 = ''

    const chargeId = 'chargeId'
    const key = createChargeIdSessionKey(chargeId)
    const cookies = getCookiesUtil()
    const frontendState = {}
    frontendState[key] = 'key_value'
    const req = {
      chargeId,
      frontend_state: frontendState
    }
    cookies.deleteSessionVariable(req, key)
    expect(req.frontend_state[key]).to.be.undefined // eslint-disable-line
  })

  it('should remove value from frontend_state_2', function () {
    process.env.SESSION_ENCRYPTION_KEY = ''
    process.env.SESSION_ENCRYPTION_KEY_2 = 'key2key2key2key2'

    const chargeId = 'chargeId'
    const key = createChargeIdSessionKey(chargeId)
    const cookies = getCookiesUtil()
    const frontendState = {}
    frontendState[key] = 'key_value'
    const req = {
      chargeId,
      frontend_state_2: frontendState
    }
    cookies.deleteSessionVariable(req, key)
    expect(req.frontend_state_2[key]).to.be.undefined // eslint-disable-line
  })
})
