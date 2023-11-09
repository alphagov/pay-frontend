const hasSubstr = require('../../app/utils/has-substr')
const expect = require('chai').expect

const testCase = 'lorem ipsum dolor sit amet'

describe('hasSubstr', () => {
  it('returns true when substring is detected', () => {
    const lookupStrings = ['ipsum']
    const result = hasSubstr(lookupStrings, testCase)
    expect(result).to.equal(true)
  })

  it('returns false when substring is not detected', () => {
    const lookupStrings = ['consectetur']
    const result = hasSubstr(lookupStrings, testCase)
    expect(result).to.equal(false)
  })

  it('ignores case when comparing', () => {
    const lookupStrings = ['DOLOR']
    const result = hasSubstr(lookupStrings, testCase)
    expect(result).to.equal(true)
  })

  it('handles multiple lookup strings', () => {
    const lookupStrings = ['consectetur', 'LOREM']
    const result = hasSubstr(lookupStrings, testCase)
    expect(result).to.equal(true)
  })
})
