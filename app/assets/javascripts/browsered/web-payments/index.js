'use strict'

// Local dependencies
const { clearErrorSummary } = require('./helpers')
const makeApplePayRequest = require('./apple-pay')
const { googlePayNow } = require('./google-pay')

// Browser elements
const paymentMethodForm = document.getElementById('web-payments-container')
const standardMethodContainer = document.getElementById('enter-card-details-container')

const initApplePayIfAvailable = () => {
  if (document.body.classList.contains('apple-pay-available')) {
    document.getElementById('payment-method-apple-pay').checked = true
    ga('send', 'event', 'Apple Pay', 'Enabled', 'Apple pay available on this device')
  }
}

const initGooglePayIfAvailable = () => {
  if (document.body.classList.contains('google-pay-available')) {
    document.getElementById('payment-method-google-pay').checked = true
    ga('send', 'event', 'Google Pay', 'Enabled', 'Google pay available on this device')
  }
}

const setupEventListener = () => {
  if (window.PaymentRequest || window.ApplePaySession) {
    paymentMethodForm.addEventListener('submit', function (e) {
      e.preventDefault()
      clearErrorSummary()
      const checkedValue = document.querySelectorAll('#web-payments-container input:checked')[0].value

      ga('send', 'event', checkedValue, 'Selection', `User chose ${checkedValue} method`)

      switch (checkedValue) {
        case 'Apple Pay':
          return makeApplePayRequest()
        case 'Google Pay':
          return googlePayNow()
        default:
          standardMethodContainer.style.display = 'block'
          paymentMethodForm.style.display = 'none'
      }
    }, false)
  }
}

const init = provider => {
  switch (provider) {
    case 'apple':
      initApplePayIfAvailable()
      break
    case 'google':
      initGooglePayIfAvailable()
      break
    default:
      initApplePayIfAvailable()
      initGooglePayIfAvailable()
      break
  }
  setupEventListener()
}

module.exports = {
  init
}
