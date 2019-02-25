'use strict'

const { prepareAppleRequestObject, showErrorSummary } = require('./helpers')

function validateMerchantSession(url) {
  console.log('dialling...', url)
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
      return session.abort();
    }
  })
}

module.exports = () => {
  const session = new ApplePaySession(3, prepareAppleRequestObject())

  session.onvalidatemerchant = event => {
    validateMerchantSession(event.validationURL)
      .then(response => {
        console.log('validated merchant', response.signature)
        session.completeMerchantValidation(response)
      }).catch(err => {
        showErrorSummary(i18n.fieldErrors.webPayments.apple)
        return err
      })
  }

  session.onpaymentauthorized = event => {
    console.log('authorisation complete', event)
    // Send payment for processing...
    const { payment } = event;
    console.log('authorisation complete', payment)

    session.completePayment(ApplePaySession.STATUS_SUCCESS);

    return fetch(`/web-payments-auth-request/apple/${window.paymentDetails.chargeID}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payment)
    }).then(response => {
      if (response.status >= 200 && response.status < 300) {
        return response.json().then(data => {
          session.completePayment(ApplePaySession.STATUS_SUCCESS);
          window.location.href = data.url
        })
      }
    })
  }
  session.begin()
}
