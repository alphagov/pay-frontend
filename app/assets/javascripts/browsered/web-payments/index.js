'use strict'

// Local dependencies
const { clearErrorSummary } = require('./helpers')
const makeApplePayRequest = require('./apple-pay')
const { googlePayNow } = require('./google-pay')

// Browser elements
const paymentMethodForms = Array.prototype.slice.call(document.getElementsByClassName('web-payments-container'))
const standardMethodForm = document.getElementById('card-details')

const initApplePayIfAvailable = () => {
  if (document.body.classList.contains('apple-pay-available')) {
    ga('send', 'event', 'Apple Pay', 'Enabled', 'Apple pay available on this device')
  }
}

const initGooglePayIfAvailable = () => {
  if (document.body.classList.contains('google-pay-available')) {
    ga('send', 'event', 'Google Pay', 'Enabled', 'Google pay available on this device')
  }
}

const setupEventListener = () => {
  if (window.PaymentRequest || window.ApplePaySession) {
    paymentMethodForms.forEach(form => {
      form.addEventListener('submit', function (e) {
        e.preventDefault()
        clearErrorSummary()
        const webPaymentMethod = e.target[0].value

        ga('send', 'event', webPaymentMethod, 'Selection', `User chose ${webPaymentMethod} method`)

        switch (webPaymentMethod) {
          case 'Apple Pay':
            return makeApplePayRequest()
          case 'Google Pay':
            return googlePayNow()
        }
      }, false)
    })

    standardMethodForm.addEventListener('submit', function (e) {
      ga('send', 'event', 'Standard', 'Selection', 'User chose Standard method')
    })
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
