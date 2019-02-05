'use strict'

const { getGooglePaymentsConfiguration, showErrorSummary } = require('./helpers')
const { email_collection_mode } = window.Charge


const processPayment = paymentData => {
  // show returned data in developer console for debugging
  console.log(paymentData);
  // @todo pass payment token to your gateway to process payment
  const paymentToken = paymentData.details.paymentMethodData.tokenizationData.token;
  console.log('paymentToken', paymentToken);
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
