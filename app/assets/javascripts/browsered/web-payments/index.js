'use strict'

// Local dependencies
const { clearErrorSummary } = require('./helpers')
const makeApplePayRequest = require('./apple-pay')
const { createGooglePaymentRequest, googlePayNow } = require('./google-pay')

// Browser elements
const paymentMethodForm = document.getElementById('payment-request-container')
const standardMethodContainer = document.getElementById('enter-card-details-container')

const initApplePayIfAvailable = () => {
  if (window.ApplePaySession && window.ApplePaySession.canMakePayments()) {
    paymentMethodForm.classList.remove('hidden')
    standardMethodContainer.classList.add('hidden')
    document.getElementById('payment-method-apple-pay').parentNode.style.display = 'block'
    document.getElementById('payment-method-apple-pay').checked = true
  }
}

const initGooglePayIfAvailable = () => {
  if (window.PaymentRequest) {
    createGooglePaymentRequest()
      .canMakePayment()
      .then(result => {
        if (result) {
          paymentMethodForm.classList.remove('hidden')
          standardMethodContainer.classList.add('hidden')
          document.getElementById('payment-method-google-pay').parentNode.style.display = 'block'
        }
      })
  }
}

const setupEventListener = () => {
  if (window.PaymentRequest || window.ApplePaySession) {
    paymentMethodForm.addEventListener('submit', function (e) {
      e.preventDefault()
      clearErrorSummary()
      const checkedValue = document.querySelectorAll('#payment-request-container input:checked')[0].value

      switch (checkedValue) {
        case 'apple-pay':
          return makeApplePayRequest()
        case 'google-pay':
          return googlePayNow()
        default:
          standardMethodContainer.classList.remove('hidden')
          paymentMethodForm.classList.add('hidden')
      }
    }, false)
  }
}

const init = provider => {
  switch (provider) {
    case 'apple':
      initApplePayIfAvailable()
      break;
    case 'google':
      initGooglePayIfAvailable()
      break;
    default:
      initApplePayIfAvailable()
      initGooglePayIfAvailable()
      break;
  }
  setupEventListener()
}

module.exports = {
  init
}
