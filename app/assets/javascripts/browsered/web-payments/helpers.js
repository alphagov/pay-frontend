'use strict'

const allowedCardTypes = window.Card.allowed || {}
const { email_collection_mode } = window.Charge || {}
const { collect_billing_address } = window.Charge || {}

const showErrorSummary = title => {
  const errorSummary = document.getElementById('error-summary')
  errorSummary.classList.remove('hidden')
  errorSummary.querySelectorAll('h2')[0].innerText = title
}

const clearErrorSummary = () => {
  const errorSummary = document.getElementById('error-summary')
  errorSummary.classList.add('hidden')
}

const supportedNetworksFormattedByProvider = provider => {
  const availableNetworks = allowedCardTypes.map(type => {
    if (type.debit || type.credit) {
      return type.brand
    }
  })
  return availableNetworks
    .filter(brand => brand !== 'diners-club')
    .filter(brand => brand !== 'unionpay')
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

  const supportedInstruments = [{
    supportedMethods: ['basic-card'],
    data: {
      supportedNetworks: supportedNetworksFormattedByProvider('apple'),
      supportedTypes
    }
  }]

  const details = {
    total: {
      label: window.paymentDetails.description,
      amount: {
        currency: 'GBP',
        value: window.paymentDetails.amount
      }
    }
  }

  const options = {
    requestPayerEmail: email_collection_mode !== 'OFF'
  }

  if (merchantCapabilities.length < 2) {
    merchantCapabilities.push('supports3DS')
  } else {
    merchantCapabilities = ['supports3DS']
  }

  const requiredShippingContactFields = email_collection_mode !== 'OFF' ? ['email'] : []

  return {
    countryCode: 'GB',
    currencyCode: details.total.amount.currency,
    total: {
      label: details.total.label,
      amount: details.total.amount.value,
    },
    supportedNetworks: supportedNetworksFormattedByProvider('apple'),
    merchantCapabilities,
    requiredShippingContactFields,
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
      allowedCardNetworks: allowedCardNetworks,
    },
    tokenizationSpecification
  }

  return {
    environment: 'TEST',
    apiVersion: 2,
    apiVersionMinor: 0,
    merchantInfo: {
      merchantId: window.googlePayMerchantID,
      merchantName: 'GOV.UK Pay'
    },
    allowedPaymentMethods: [cardPaymentMethod]
  }
}

module.exports = {
  showErrorSummary,
  clearErrorSummary,
  prepareAppleRequestObject,
  getGooglePaymentsConfiguration
}
