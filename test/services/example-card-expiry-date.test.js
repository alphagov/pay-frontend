'use strict'

const path = require('path')
const sinon = require('sinon')
const moment = require('moment-timezone')
const { expect } = require('chai')
const { getFutureYearAs2Digits } = require(path.join(__dirname, '/../../app/services/example_card_expiry_date.js'))

const mockNewDateToAlwaysReturn = (moment) => sinon.useFakeTimers({ now: moment.toDate(), toFake: ['Date'] })

describe('Example card expiry date year', () => {
  var clock

  afterEach(() => {
    if (clock) {
      clock.restore()
    }
  })

  it('should return ‘22’ when the current year in the United Kingdom is 2020', () => {
    const nowIn2020 = moment.tz('2020-07-01 12:00', 'Europe/London')
    clock = mockNewDateToAlwaysReturn(nowIn2020)

    const result = getFutureYearAs2Digits()

    expect(result).to.equal('22')
  })

  it('should return ‘23’ when the current year in the United Kingdom is 2021', () => {
    const nowIn2021 = moment.tz('2021-07-01 12:00', 'Europe/London')
    clock = mockNewDateToAlwaysReturn(nowIn2021)

    const result = getFutureYearAs2Digits()

    expect(result).to.equal('23')
  })

  it('should return ‘24’ when the current year in the United Kingdom is 2022', () => {
    const nowIn2022 = moment.tz('2022-07-01 12:00', 'Europe/London')
    clock = mockNewDateToAlwaysReturn(nowIn2022)

    const result = getFutureYearAs2Digits()

    expect(result).to.equal('24')
  })
})
