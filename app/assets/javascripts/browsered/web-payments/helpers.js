'use strict'

const supportedNetworksFormattedByProvider = require('./format-card-types')

const allowedCardTypes = window.Card.allowed || {}
const { email_collection_mode } = window.Charge || {} // eslint-disable-line camelcase

const showErrorSummary = (title, body) => {
  const errorSummary = document.getElementById('error-summary')
  errorSummary.querySelectorAll('ul')[0].innerHTML = ''
  errorSummary.classList.remove('hidden')
  errorSummary.querySelectorAll('h2')[0].innerText = title
  if (body) {
    const error = document.createElement('li')
    error.innerText = body
    errorSummary.querySelectorAll('ul')[0].appendChild(error)
  }
}

const clearErrorSummary = () => {
  const errorSummary = document.getElementById('error-summary')
  errorSummary.classList.add('hidden')
}

const toggleWaiting = (paymentMethodSubmitId) => {
  const button = document.getElementById(paymentMethodSubmitId)
  button[button.hasAttribute('disabled') ? 'removeAttribute' : 'setAttribute']('disabled', 'disabled')
  document.getElementById('spinner').classList.toggle('hidden')
}

const prepareAppleRequestObject = () => {
  const supportedTypes = []
  let merchantCapabilities = []
  if (!allowedCardTypes.every(type => type.debit === false)) {
    supportedTypes.push('debit')
    merchantCapabilities.push('supportsDebit')
  }

  if (!allowedCardTypes.every(type => type.credit === false)) {
    supportedTypes.push('credit')
    merchantCapabilities.push('supportsCredit')
  }

  const details = {
    total: {
      label: window.paymentDetails.description,
      amount: {
        currency: 'GBP',
        value: window.paymentDetails.amount
      }
    }
  }

  if (merchantCapabilities.length < 2) {
    merchantCapabilities.push('supports3DS')
  } else {
    merchantCapabilities = ['supports3DS']
  }

  const requiredShippingContactFields = email_collection_mode !== 'OFF' ? ['email'] : [] // eslint-disable-line camelcase

  return {
    countryCode: 'GB',
    currencyCode: details.total.amount.currency,
    total: {
      label: details.total.label,
      amount: details.total.amount.value
    },
    supportedNetworks: supportedNetworksFormattedByProvider(allowedCardTypes, 'apple'),
    merchantCapabilities,
    requiredShippingContactFields
  }
}

const getGooglePaymentsConfiguration = (paymentProvider) => {
  const allowedCardNetworks = supportedNetworksFormattedByProvider(allowedCardTypes, 'google')
  const allowedCardAuthMethods = ['PAN_ONLY', 'CRYPTOGRAM_3DS']
  const tokenizationSpecification = {
    type: 'PAYMENT_GATEWAY',
    parameters: {
      ...(paymentProvider === 'stripe' && {
        gateway: 'stripe',
        'stripe:version': '2018-10-31',
        'stripe:publishableKey': window.stripePublishableKey
      }),
      ...(paymentProvider === 'worldpay' && {
        gateway: 'worldpay',
        gatewayMerchantId: window.googlePayGatewayMerchantID
      }),
      // In order to initiate a Google Pay payment in the Google Pay test environment without going to a real payment
      // provider, the workaround is to specify ‘worldpay’ without a merchant id.
      ...(paymentProvider === 'sandbox' && {
        gateway: 'worldpay',
        gatewayMerchantId: ''
      })
    }
  }

  const cardPaymentMethod = {
    type: 'CARD',
    parameters: {
      allowedAuthMethods: allowedCardAuthMethods,
      allowedCardNetworks: allowedCardNetworks,
      assuranceDetailsRequired: true
    },
    tokenizationSpecification
  }

  return {
    environment: (window.googlePayMerchantID.length > 0 && window.gatewayAccountType === 'live') ? 'PRODUCTION' : 'TEST',
    apiVersion: 2,
    apiVersionMinor: 0,
    merchantInfo: {
      merchantId: window.googlePayMerchantID,
      merchantName: 'GOV.UK Pay'
    },
    transactionInfo: {
      totalPriceStatus: 'FINAL',
      totalPrice: window.paymentDetails.amount,
      countryCode: 'GB',
      currencyCode: 'GBP'
    },
    allowedPaymentMethods: [cardPaymentMethod]
  }
}

module.exports = {
  showErrorSummary,
  clearErrorSummary,
  toggleWaiting,
  prepareAppleRequestObject,
  getGooglePaymentsConfiguration
}
