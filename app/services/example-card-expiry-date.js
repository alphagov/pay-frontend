'use strict'

const moment = require('moment-timezone')

const getFutureYearAs2Digits = () => moment(new Date()).tz('Europe/London').add(2, 'years').format('YY')

module.exports = {
  getFutureYearAs2Digits
}
