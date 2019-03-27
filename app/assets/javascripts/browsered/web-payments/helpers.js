'use strict'

const allowedCardTypes = window.Card.allowed || {}
const { email_collection_mode } = window.Charge || {} // eslint-disable-line camelcase

const showErrorSummary = (title, body) => {
  const errorSummary = document.getElementById('error-summary')
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

const toggleWaiting = status => {
  const button = document.getElementById('payment-method-submit')
  button[button.getAttribute('disabled') ? 'removeAttribute' : 'setAttribute']('disabled', 'disabled')
  document.getElementById('spinner').classList.toggle('hidden')
}

const supportedNetworksFormattedByProvider = provider => {
  const availableNetworks = allowedCardTypes.map(type => {
    if (type.debit || type.credit) {
      return type.brand
    }
  })

  let filteredAvailableNetworks = availableNetworks
    .filter(brand => brand !== 'diners-club')
    .filter(brand => brand !== 'unionpay')

  if (provider === 'google') {
    filteredAvailableNetworks = filteredAvailableNetworks.filter(brand => brand !== 'maestro')
  }

  if (provider === 'apple' && filteredAvailableNetworks.includes('visa')) {
    filteredAvailableNetworks.push('electron')
  }

  return filteredAvailableNetworks
    .map(brand => {
      let formattedBrand = brand
      if (brand === 'master-card') formattedBrand = 'masterCard'
      if (brand === 'american-express') formattedBrand = 'amex'
      return provider === 'google' ? formattedBrand.toUpperCase() : formattedBrand
    })
}

const prepareAppleRequestObject = () => {
  let supportedTypes = []
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
    supportedNetworks: supportedNetworksFormattedByProvider('apple'),
    merchantCapabilities,
    requiredShippingContactFields
  }
}

const getGooglePaymentsConfiguration = () => {
  const allowedCardNetworks = supportedNetworksFormattedByProvider('google')
  const allowedCardAuthMethods = ['PAN_ONLY', 'CRYPTOGRAM_3DS']
  const tokenizationSpecification = {
    type: 'PAYMENT_GATEWAY',
    parameters: {
      gateway: 'worldpay',
      gatewayMerchantId: window.googlePayGatewayMerchantID
    }
  }

  const cardPaymentMethod = {
    type: 'CARD',
    parameters: {
      allowedAuthMethods: allowedCardAuthMethods,
      allowedCardNetworks: allowedCardNetworks
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
