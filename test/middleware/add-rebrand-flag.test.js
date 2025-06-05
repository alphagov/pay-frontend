const { expect } = require('chai')
const sinon = require('sinon')

// Local dependencies
const addRebrandFlag = require('../../app/middleware/add-rebrand-flag.js')

const req = {}
const res = {
  locals: {}
}

const next = sinon.spy()

describe('Add rebrand flag - middleware', function () {
  beforeEach(function () {
    process.env.ENABLE_REBRAND = undefined
    res.locals = {}
    next.resetHistory()
  })

  it('should set res.locals.enableRebrand = undefined when When process.env.ENABLE_REBRAND = undefined', function () {
    addRebrandFlag(req, res, next)
    expect(next.called).to.equal(true)
    // assert.strictEqual(res.locals.enableRebrand, undefined)
    expect(res.locals.enableRebrand).to.equal(false)
  })

  it('should set res.locals.enableRebrand = true when When process.env.ENABLE_REBRAND = true', function () {
    process.env.ENABLE_REBRAND = 'true'
    addRebrandFlag(req, res, next)
    expect(res.locals.enableRebrand).to.equal(true)
    expect(next.called).to.equal(true)
  })

  it('should set res.locals.enableRebrand = false when When process.env.ENABLE_REBRAND = false', function () {
    process.env.ENABLE_REBRAND = 'false'
    addRebrandFlag(req, res, next)
    expect(next.called).to.equal(true)
    expect(res.locals.enableRebrand).to.equal(false)
  })
})
