'use strict'

const { getGooglePaymentsConfiguration, showErrorSummary } = require('./helpers')
const { email_collection_mode } = window.Charge


const processPayment = paymentData => {
  return fetch(`/web-payments-auth-request/google/${window.paymentDetails.chargeID}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(paymentData)
  })
  .then(response => {
    if (response.status >= 200 && response.status < 300) {
      return response.json().then(data => {
        window.location.href = data.url
      })
    }
  })
  .catch(err => {
    console.log('something went wrong', err)
  })
}

const createGooglePaymentRequest = () => {
  const methodData = [{
    supportedMethods: 'https://google.com/pay',
    data: getGooglePaymentsConfiguration()
  }];

  const details = {
    total: {
      label: window.paymentDetails.description,
      amount: {
        currency: 'GBP',
        value: window.paymentDetails.amount
      }
    }
  };

  const options = {
    requestPayerEmail: email_collection_mode !== 'OFF',
    requestPayerName: true
  };

  return new PaymentRequest(methodData, details, options);
}

const googlePayNow = () => {
  createGooglePaymentRequest()
    .show()
    .then(response => {
      response.complete('success');
      console.log('payment data', response)
      processPayment(response);
    })
    .catch(err => {
      console.error('uh oh', err)
    })
}

module.exports = {
  createGooglePaymentRequest,
  googlePayNow
}
