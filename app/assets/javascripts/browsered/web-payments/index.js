'use strict'

const { prepareRequestObject, clearErrorSummary } = require('./helpers')
const makeApplePayRequest = require('./apple-pay')
const makePaymentRequest = require('./google-pay')

module.exports = () => {
  const paymentMethodForm = document.getElementById('payment-request-container')
  const standardMethodContainer = document.getElementById('enter-card-details-container')

  if (window.PaymentRequest && paymentMethodForm) {
    paymentMethodForm.classList.remove('hidden')
    standardMethodContainer.classList.add('hidden')

    if (window.ApplePaySession && ApplePaySession.canMakePayments()) {
      document.getElementById('payment-method-payment-request-apple').parentNode.style.display = 'block'
    } else if (/Chrome/.test(navigator.userAgent) && /Google Inc/.test) {
      document.getElementById('payment-method-payment-request').parentNode.style.display = 'block'
    }

    document.getElementById('payment-request-container').addEventListener('submit', function (e) {
      e.preventDefault()
      clearErrorSummary()
      const checkedValue = document.querySelectorAll('#payment-request-container input:checked')[0].value
      if (checkedValue === 'standard') {
        standardMethodContainer.classList.remove('hidden')
        paymentMethodForm.classList.add('hidden')
      }

      if (checkedValue === 'payment-request') {
        makePaymentRequest()
      } else if (checkedValue === 'payment-request-apple') {
        makeApplePayRequest()
      }
    }, false)
  }
}
