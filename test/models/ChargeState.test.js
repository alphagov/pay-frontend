const expect = require('chai').expect
const sinon = require('sinon')
const { ChargeState, chargeStateFromString } = require('../../app/models/ChargeState')

describe('ChargeState model should', () => {
  let clock

  beforeEach(() => {
    const fixedDate = new Date(1721390000000) // 19 July 2024 11:53:20
    clock = sinon.useFakeTimers(fixedDate)
  })

  afterEach(() => {
    clock.restore()
  })

  it('create new ChargeState with no parameters', () => {
    const result = new ChargeState()
    expect(result.isTerminal).to.equal(false)
    expect(result.accessedAt).to.equal(1721390000)
    expect(result.createdAt).to.equal(1721390000)
  })
  it('create new ChargeState with parameters', () => {
    const result = new ChargeState(1721390555, 1721390999, true)
    expect(result.isTerminal).to.equal(true)
    expect(result.accessedAt).to.equal(1721390999)
    expect(result.createdAt).to.equal(1721390555)
  })
  it('set isComplete to true and update accessedAt when done is called', () => {
    const result = new ChargeState()
    expect(result.isTerminal).to.equal(false)
    expect(result.createdAt).to.equal(1721390000)
    expect(result.accessedAt).to.equal(1721390000)
    clock.restore()
    clock = sinon.useFakeTimers(1721399999999)
    result.markTerminal()
    expect(result.createdAt).to.equal(1721390000)
    expect(result.isTerminal).to.equal(true)
    expect(result.accessedAt).to.equal(1721399999)
  })
  it('set accessedAt to now when updateAccessedAt is called', () => {
    const result = new ChargeState(1721390000, 1721390000, false)
    expect(result.isTerminal).to.equal(false)
    expect(result.accessedAt).to.equal(1721390000)
    clock.restore()
    clock = sinon.useFakeTimers(1721399999999)
    result.updateAccessedAt()
    expect(result.isTerminal).to.equal(false)
    expect(result.accessedAt).to.equal(1721399999)
  })
  it('return string representation when toString is called', () => {
    const result = new ChargeState().toString()
    expect(result).to.equal('1721390000,1721390000,F')
  })
  it('return ChargeState representation from string', () => {
    const result = chargeStateFromString('1721390000,1721399999,F')
    expect(result.isTerminal).to.equal(false)
    expect(result.accessedAt).to.equal(1721399999)
    expect(result.createdAt).to.equal(1721390000)
  })
  const invalidArgs = [
    { input: null },
    { input: undefined },
    { input: '' },
    { input: 'randomstringhere' },
    { input: 'too,many,arg,umen,ts' },
    { input: 'toofew,arguments' }
  ]
  invalidArgs.forEach(({ input }) => {
    it(`return null if chargeStateFromString argument is not valid [${input}]`, () => {
      const result = chargeStateFromString(input)
      expect(result).to.be.null // eslint-disable-line
    })
  })
})
