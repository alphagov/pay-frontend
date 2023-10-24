const inputConfirm = require('./assets/javascripts/browsered/form-input-confirm')
const webPayments = require('./assets/javascripts/browsered/web-payments')
const analytics = require('gaap-analytics')
const formValidation = require('./assets/javascripts/browsered/form-validation')
const epdq3ds2 = require('./assets/javascripts/browsered/epdq-3ds2')
const helpers = require('./assets/javascripts/browsered/helpers')
const sentry = require('./assets/javascripts/browsered/sentry')

exports.chargeValidation = require('./utils/charge-validation')
analytics.eventTracking.init()

// Place functions into scope so can trigger in scripts.njk
window.payScripts = { // eslint-disable-line no-unused-vars
  helpers,
  inputConfirm,
  webPayments,
  formValidation,
  epdq3ds2,
  sentry
}

// GA tracking if an email typo is spotted
if (document.getElementById('email-uncorrected')) {
  const originalEmail = document.getElementById('email-uncorrected')
  originalEmail.addEventListener('click', () => {
    document.getElementById('submit-card-details').dataset.clickAction = `Uncorrected email: @${originalEmail.value.split('@')[1]}`
  }, false)
  const correctedEmail = document.getElementById('email-corrected')
  correctedEmail.addEventListener('click', () => {
    document.getElementById('submit-card-details').dataset.clickAction = `Corrected email: @${correctedEmail.value.split('@')[1]}`
  }, false)
}
