'use strict'

const { clearErrorSummary } = require('./helpers')
const makeApplePayRequest = require('./apple-pay')
const { createGooglePaymentRequest, googlePayNow } = require('./google-pay')

const init = () => {
  const paymentMethodForm = document.getElementById('payment-request-container')
  const standardMethodContainer = document.getElementById('enter-card-details-container')

  if (window.PaymentRequest && paymentMethodForm) {
    if (window.ApplePaySession && ApplePaySession.canMakePayments()) {
      paymentMethodForm.classList.remove('hidden')
      standardMethodContainer.classList.add('hidden')
      document.getElementById('payment-method-apple-pay').parentNode.style.display = 'block'
      document.getElementById('payment-method-apple-pay').checked = true
    } else {
      console.log('payment request API is available')
      const request = createGooglePaymentRequest();
      request.canMakePayment()
        .then(result => {
          if (result) {
            console.log('Google Pay is available')
            paymentMethodForm.classList.remove('hidden')
            standardMethodContainer.classList.add('hidden')
            document.getElementById('payment-method-google-pay').parentNode.style.display = 'block'
          }
        })
    }

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

module.exports = {
  init
}
