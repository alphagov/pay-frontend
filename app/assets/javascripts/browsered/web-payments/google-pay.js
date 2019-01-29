'use strict'

const { prepareGoogleRequestObjects, showErrorSummary } = require('./helpers')
let paymentsClient = null;

const getGoogleTransactionInfo = () => {
  return {
    currencyCode: 'GBP',
    totalPriceStatus: 'FINAL',
    totalPrice: window.paymentDetails.amount
  };
}

const processPayment = paymentData => {
  // show returned data in developer console for debugging
  console.log(paymentData);
  // @todo pass payment token to your gateway to process payment
  const paymentToken = paymentData.paymentMethodData.tokenizationData.token;
  console.log('paymentToken', paymentToken);
}

const paymentDataRequest = prepareGoogleRequestObjects();
paymentDataRequest.transactionInfo = getGoogleTransactionInfo();

const getGooglePaymentsClient = () => {
  if (paymentsClient === null) {
    paymentsClient = new google.payments.api.PaymentsClient({ environment: 'TEST' });
  }
  return paymentsClient;
}

module.exports = () => {
  paymentsClient = getGooglePaymentsClient();

  paymentsClient.loadPaymentData(paymentDataRequest)
    .then(paymentData => {
      processPayment(paymentData);
    })
    .catch(err => {
      console.error(err);
      showErrorSummary('There was an error contacting Google Pay, please try again')
    });
}
