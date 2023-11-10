'use strict'

// Local dependencies
const { clearErrorSummary } = require('./helpers')
const makeApplePayRequest = require('./apple-pay')
const { googlePayNow } = require('./google-pay')
const { sendLogMessage } = require('../helpers')

// Browser elements
const paymentMethodForms = Array.prototype.slice.call(document.getElementsByClassName('web-payments-container'))
const standardMethodForm = document.getElementById('card-details')

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
            sendLogMessage(window.chargeId, 'ApplePayStarted')
            return makeApplePayRequest()
          case 'Google Pay':
            sendLogMessage(window.chargeId, 'GooglePayStarted')
            return googlePayNow()
        }
      }, false)
    })

    standardMethodForm.addEventListener('submit', function (e) {
      ga('send', 'event', 'Standard', 'Selection', 'User chose Standard method')
    })
  }
}

const init = () => {
  setupEventListener()
}

module.exports = {
  init
}
