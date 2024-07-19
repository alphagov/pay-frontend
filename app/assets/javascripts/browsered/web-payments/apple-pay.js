'use strict'

const { prepareAppleRequestObject, showErrorSummary } = require('./helpers')
const {
  toggleSubmitButtons,
  showSpinnerAndHideMainContent,
  hideSpinnerAndShowMainContent,
  sendLogMessage
} = require('../helpers')
const { validateEmail } = require('../../../../utils/email-validation')
const { email_collection_mode } = window.Charge || {} // eslint-disable-line camelcase

module.exports = () => {
  const session = new ApplePaySession(4, prepareAppleRequestObject())

  function validateMerchantSession (url) {
    return fetch('/apple-pay-merchant-validation', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        paymentProvider: window.Charge.payment_provider
      })
    }).then(response => {
      console.log('** - JS - success')
      if (response.status >= 200 && response.status < 300) {
        return response.json().then(data => {
          return data
        })
      } else {
        console.log('** - JS - error')
        ga('send', 'event', 'Apple Pay', 'Error', 'Merchant ID not valid')
        sendLogMessage(window.chargeId, 'ApplePayMerchantIdNotValid')
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
        sendLogMessage(window.chargeId, 'ApplePayMerchantValidationError')
        return err
      })
  }

  session.onpaymentauthorized = event => {
    const { payment } = event
    toggleSubmitButtons()
    showSpinnerAndHideMainContent()

    if (email_collection_mode !== 'OFF') { // eslint-disable-line camelcase
      if (!payment.shippingContact || typeof payment.shippingContact.emailAddress !== 'string' ||
        !validateEmail(payment.shippingContact.emailAddress).valid) {
        hideSpinnerAndShowMainContent()
        toggleSubmitButtons()
        showErrorSummary(i18n.fieldErrors.summary, i18n.fieldErrors.fields.email.message)

        const emailError = new ApplePayError('shippingContactInvalid', 'emailAddress', i18n.fieldErrors.fields.email.message)
        return session.completePayment({
          status: ApplePaySession.STATUS_FAILURE,
          errors: [emailError]
        })
      }
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
        ga('send', 'event', 'Apple Pay', 'Successful', 'auth/capture request')
        return response.json().then(data => {
          session.completePayment(ApplePaySession.STATUS_SUCCESS)
          window.location.href = data.url
        })
      } else {
        session.abort()
        hideSpinnerAndShowMainContent()
        toggleSubmitButtons()
        showErrorSummary(i18n.fieldErrors.webPayments.apple)
        ga('send', 'event', 'Apple Pay', 'Error', 'During authorisation/capture')
        sendLogMessage(window.paymentDetails.chargeID, 'ApplePayServerError')
      }
    }).catch(err => {
      session.abort()
      hideSpinnerAndShowMainContent()
      toggleSubmitButtons()
      showErrorSummary(i18n.fieldErrors.webPayments.apple)
      ga('send', 'event', 'Apple Pay', 'Error', 'Couldn’t post to /web-payments-auth-request/apple/{chargeId}')
      sendLogMessage(window.paymentDetails.chargeID, 'ApplePayErrorMakingRequestToAuthorise')
      return err
    })
  }

  session.oncancel = event => {
    sendLogMessage(window.chargeId, 'ApplePayAborted')
  }

  session.begin()
}
