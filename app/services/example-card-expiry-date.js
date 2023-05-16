'use strict'

const getFutureYearAs2Digits = () => ((new Date()).getFullYear() + 2).toString().slice(-2)

module.exports = {
  getFutureYearAs2Digits
}
