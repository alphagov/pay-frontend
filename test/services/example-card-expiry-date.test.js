'use strict'

const sinon = require('sinon')
const { expect } = require('chai')
const { getFutureYearAs2Digits } = require('../../app/services/example-card-expiry-date.js')

const mockNewDateToAlwaysReturn = (date) => sinon.useFakeTimers({ now: date, toFake: ['Date'] })

describe('Example card expiry date year', () => {
  let clock

  afterEach(() => {
    if (clock) {
      clock.restore()
    }
  })

  it('should return ‘22’ when the current year is 2020', () => {
    const nowIn2020 = new Date('2020-07-01T12:00:00')
    clock = mockNewDateToAlwaysReturn(nowIn2020)

    const result = getFutureYearAs2Digits()

    expect(result).to.equal('22')
  })

  it('should return ‘23’ when the current year is 2021', () => {
    const nowIn2021 = new Date('2021-07-01T12:00:00')
    clock = mockNewDateToAlwaysReturn(nowIn2021)

    const result = getFutureYearAs2Digits()

    expect(result).to.equal('23')
  })

  it('should return ‘24’ when the current year is 2022', () => {
    const nowIn2022 = new Date('2022-07-01T12:00:00')
    clock = mockNewDateToAlwaysReturn(nowIn2022)

    const result = getFutureYearAs2Digits()

    expect(result).to.equal('24')
  })
})
