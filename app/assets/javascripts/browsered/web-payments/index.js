'use strict'

// Local dependencies
const { clearErrorSummary } = require('./helpers')
const makeApplePayRequest = require('./apple-pay')
const { createGooglePaymentRequest, googlePayNow } = require('./google-pay')

// Browser elements
const paymentMethodForm = document.getElementById('web-payments-container')
const standardMethodContainer = document.getElementById('enter-card-details-container')

const initApplePayIfAvailable = () => {
  if (document.body.classList.contains('apple-pay-available')) {
    document.getElementById('payment-method-apple-pay').checked = true
  }
}

const initGooglePayIfAvailable = () => {
  if (window.PaymentRequest) {
    createGooglePaymentRequest()
      .canMakePayment()
      .then(result => {
        if (result) {
          document.body.classList.remove('google-pay-unavailable')
          document.body.classList.add('google-pay-available')
        }
      }).catch(err => {
        ga('send', 'event', 'Google Pay', 'Error', 'Failed to check if Google Pay available')
        return err
      })
  }
}

const setupEventListener = () => {
  if (window.PaymentRequest || window.ApplePaySession) {
    paymentMethodForm.addEventListener('submit', function (e) {
      e.preventDefault()
      clearErrorSummary()
      const checkedValue = document.querySelectorAll('#web-payments-container input:checked')[0].value

      switch (checkedValue) {
        case 'apple-pay':
          return makeApplePayRequest()
        case 'google-pay':
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
