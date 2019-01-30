'use strict'

const allowedCardTypes = window.Card || {}
const { email_collection_mode } = window.Charge

const showErrorSummary = title => {
const errorSummary = document.getElementById('error-summary')

errorSummary.classList.remove('hidden')
errorSummary.querySelectorAll('h2')[0].innerText = title
}

const clearErrorSummary = () => {
  const errorSummary = document.getElementById('error-summary')

  errorSummary.classList.add('hidden')
}

const prepareRequestObject = brand => {
  const supportedNetworks = allowedCardTypes.allowed.map(type => {
    if (type.debit || type.credit) {
      return type.brand
    }
  })

  let supportedTypes = []
  let merchantCapabilities = []
  if (!allowedCardTypes.allowed.every(type => type.debit === false)) {
    supportedTypes.push('debit')
    merchantCapabilities.push('supportsDebit')
  }

  if (!allowedCardTypes.allowed.every(type => type.credit === false)) {
    supportedTypes.push('credit')
    merchantCapabilities.push('supportsCredit')
  }

  const supportedInstruments = [{
    supportedMethods: ['basic-card'],
    data: {
      supportedNetworks,
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

  if (brand === 'apple') {
    const supportedNetworksAppleFormatted = supportedNetworks.map(brand => {
      if (brand === 'master-card') return 'masterCard'
      if (brand === 'american-express') return 'amex'
      return brand
    }).filter(brand => brand !== 'diners-club')
      .filter(brand => brand !== 'unionpay')

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
      supportedNetworks: supportedNetworksAppleFormatted,
      merchantCapabilities,
      requiredShippingContactFields,
    }
  } else {
    return {
      supportedInstruments,
      details,
      options
    }
  }
}

module.exports = {
  showErrorSummary,
  clearErrorSummary,
  prepareRequestObject
}
