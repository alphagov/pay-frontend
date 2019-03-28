'use strict'

const { prepareAppleRequestObject, showErrorSummary, toggleWaiting } = require('./helpers')
const rfc822Validator = require('rfc822-validate')

module.exports = () => {
  const session = new ApplePaySession(4, prepareAppleRequestObject())

  function validateMerchantSession (url) {
    return fetch(`/apple-pay-merchant-validation`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    }).then(response => {
      if (response.status >= 200 && response.status < 300) {
        return response.json().then(data => {
          return data
        })
      } else {
        ga('send', 'event', 'Apple Pay', 'Error', 'Merchant ID not valid')
        return session.abort()
      }
    })
  }

  session.onvalidatemerchant = event => {
    validateMerchantSession(event.validationURL)
      .then(response => {
        session.completeMerchantValidation(response)
      }).catch(err => {
        showErrorSummary(i18n.fieldErrors.webPayments.apple)
        ga('send', 'event', 'Apple Pay', 'Error', 'Error completing Merchant validation')
        return err
      })
  }

  session.onpaymentauthorized = event => {
    const { payment } = event
    toggleWaiting()

    if (!rfc822Validator(payment.shippingContact.emailAddress)) {
      toggleWaiting()
      showErrorSummary(i18n.fieldErrors.summary, i18n.fieldErrors.fields.email.message)
      return new ApplePayError('shippingContactInvalid', 'emailAddress', i18n.fieldErrors.fields.email.message)
    }

    return fetch(`/web-payments-auth-request/apple/${window.paymentDetails.chargeID}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payment)
    }).then(response => {
      if (response.status >= 200 && response.status < 300) {
        ga('send', 'event', 'Apple Pay', 'Sucessful', 'auth/capture request')
        return response.json().then(data => {
          session.completePayment(ApplePaySession.STATUS_SUCCESS)
          window.location.href = data.url
        })
      } else {
        session.abort()
        toggleWaiting()
        showErrorSummary(i18n.fieldErrors.webPayments.apple)
        ga('send', 'event', 'Apple Pay', 'Error', 'During authorisation/capture')
      }
    }).catch(err => {
      session.abort()
      toggleWaiting()
      showErrorSummary(i18n.fieldErrors.webPayments.apple)
      ga('send', 'event', 'Apple Pay', 'Error', 'Couldn’t post to /web-payments-auth-request/apple/{chargeId}')
      return err
    })
  }

  session.begin()
}
