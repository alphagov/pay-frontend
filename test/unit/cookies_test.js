var expect = require('chai').expect
var path = require('path')
var sinon = require('sinon')
var proxyquire = require('proxyquire')

var getCookiesUtil = function (clientSessionsStub) {
  if (clientSessionsStub) {
    return proxyquire(path.join(__dirname, '/../../app/utils/cookies'), {
      'client-sessions': clientSessionsStub
    })
  } else {
    return require(path.join(__dirname, '/../../app/utils/cookies'))
  }
}

describe('cookie configuration', function () {
  it('should configure cookie correctly', function () {
    let app = {
      use: sinon.stub()
    }
    let clientSessionsStub = sinon.stub()
    let cookies = getCookiesUtil(clientSessionsStub)

    let expectedConfig = {
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
    let key2 = 'bobbobbobbob'
    process.env.SESSION_ENCRYPTION_KEY_2 = key2
    let app = {
      use: sinon.spy()
    }
    let clientSessionsStub = sinon.stub()
    let cookies = getCookiesUtil(clientSessionsStub)

    let expectedConfig1 = {
      cookieName: 'frontend_state',
      proxy: true,
      secret: 'naskjwefvwei72rjkwfmjwfi72rfkjwefmjwefiuwefjkbwfiu24fmjbwfk',
      cookie: {
        maxAge: 5400000,
        httpOnly: true,
        secureProxy: true
      }
    }

    let expectedConfig2 = {
      cookieName: 'frontend_state_2',
      proxy: true,
      secret: key2,
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

    delete process.env.SESSION_ENCRYPTION_KEY_2
  })

  it('should configure two cookies if two session keys are set', function () {
    process.env.SESSION_ENCRYPTION_KEY_2 = ''
    let app = {
      use: sinon.spy()
    }
    let clientSessionsStub = sinon.stub()
    let cookies = getCookiesUtil(clientSessionsStub)

    let expectedConfig1 = {
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

    delete process.env.SESSION_ENCRYPTION_KEY_2
  })

  it('should throw an error if no session keys are set', function () {
    let originalKey = process.env.SESSION_ENCRYPTION_KEY
    delete process.env.SESSION_ENCRYPTION_KEY_2
    process.env.SESSION_ENCRYPTION_KEY = ''

    let clientSessionsStub = sinon.stub()
    let cookies = getCookiesUtil(clientSessionsStub)

    expect(() => cookies.configureSessionCookie({})).to.throw(/cookie encryption key is not set/)

    process.env.SESSION_ENCRYPTION_KEY = originalKey
  })

  it('should throw an error if no valid session keys are set', function () {
    let originalKey = process.env.SESSION_ENCRYPTION_KEY
    process.env.SESSION_ENCRYPTION_KEY_2 = 'asfdwv'
    process.env.SESSION_ENCRYPTION_KEY = ''

    let clientSessionsStub = sinon.stub()
    let cookies = getCookiesUtil(clientSessionsStub)

    expect(() => cookies.configureSessionCookie({})).to.throw(/cookie encryption key is not set/)

    process.env.SESSION_ENCRYPTION_KEY = originalKey
    delete process.env.SESSION_ENCRYPTION_KEY_2
  })
})

describe('setting value on session', function () {
  it('should set value on frontend_state if SESSION_ENCRYPTION_KEY set', function () {
    let cookies = getCookiesUtil()
    let req = {
      frontend_state: {

      }
    }

    cookies.setSessionVariable(req, 'foo', 'bar')

    expect(req.frontend_state.foo).to.equal('bar')
  })

  it('should set value on frontend_state_2 if SESSION_ENCRYPTION_KEY_2 set', function () {
    let originalKey = process.env.SESSION_ENCRYPTION_KEY
    process.env.SESSION_ENCRYPTION_KEY = ''

    process.env.SESSION_ENCRYPTION_KEY_2 = 'key2key2key2key2'

    let cookies = getCookiesUtil()
    let req = {
      frontend_state_2: {

      }
    }

    cookies.setSessionVariable(req, 'foo', 'baz')

    expect(req.frontend_state_2.foo).to.equal('baz')

    process.env.SESSION_ENCRYPTION_KEY = originalKey

    delete process.env.SESSION_ENCRYPTION_KEY_2
  })

  it('should set values on frontend_state and frontend_state_2 if both keys set', function () {
    process.env.SESSION_ENCRYPTION_KEY_2 = 'key2key2key2key2'

    let cookies = getCookiesUtil()
    let req = {
      frontend_state: {},
      frontend_state_2: {}
    }

    cookies.setSessionVariable(req, 'foo', 'baz')

    expect(req.frontend_state.foo).to.equal('baz')
    expect(req.frontend_state_2.foo).to.equal('baz')

    delete process.env.SESSION_ENCRYPTION_KEY_2
  })

  it('does not try to set value on non-existent cookie', function () {
    let cookies = getCookiesUtil()
    let req = {}

    cookies.setSessionVariable(req, 'foo', 'bar')

    expect(req).to.deep.equal({})
  })
})

describe('getting value from session', function () {
  it('should get value on frontend_state if only SESSION_ENCRYPTION_KEY set', function () {
    let cookies = getCookiesUtil()
    let req = {
      frontend_state: {
        foo: 'bar'
      }
    }

    expect(cookies.getSessionVariable(req, 'foo')).to.equal('bar')
  })

  it('should get value on frontend_state_2 if only SESSION_ENCRYPTION_KEY_2 set', function () {
    let originalKey = process.env.SESSION_ENCRYPTION_KEY
    delete process.env.SESSION_ENCRYPTION_KEY

    process.env.SESSION_ENCRYPTION_KEY_2 = 'key2key2key2key2'

    let cookies = getCookiesUtil()
    let req = {
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

    let cookies = getCookiesUtil()
    let req = {
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
})
