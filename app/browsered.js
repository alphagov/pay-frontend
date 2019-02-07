const inputConfirm = require('./assets/javascripts/browsered/form-input-confirm')
const webPayments = require('./assets/javascripts/browsered/web-payments')
const analytics = require('gaap-analytics')

exports.chargeValidation = require('./utils/charge_validation')
analytics.eventTracking.init()

// Place functions into scope so can trigger in scripts.njk
window.payScripts = { // eslint-disable-line no-unused-vars
  inputConfirm,
  webPayments
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
