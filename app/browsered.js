require('babel-polyfill')

const inputConfim = require('./assets/javascripts/modules/form-input-confirm')

window.jQuery = window.$ = require('jquery')
exports.chargeValidation = require('./utils/charge_validation')

inputConfim()
