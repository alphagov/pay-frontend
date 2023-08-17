const setGlobalChargeId = () => {
  const chargeId = document.getElementById('charge-id').value
  window.chargeId = chargeId
}

const initialiseAddressCountryAutocomplete = () => {
  const autocompleteScript = document.createElement('script')

  autocompleteScript.onload = function () {
    openregisterLocationPicker({
      selectElement: document.getElementById('address-country'),
      url: '/public/countries-autocomplete-graph.json',
      autoselect: true,
      displayMenu: 'overlay'
    })

    document.getElementById('address-country').setAttribute('autocomplete', 'country-disabled-autocomplete')
  }

  autocompleteScript.setAttribute('type', 'text/javascript')
  autocompleteScript.setAttribute('src', '/public/location-autocomplete.min.js')
  document.getElementsByTagName('head')[0].appendChild(autocompleteScript)
}

const toggleButton = (button) => {
  if (button) {
    button[button.getAttribute('disabled') ? 'removeAttribute' : 'setAttribute']('disabled', 'disabled')
  }
}

const toggleSubmitButtons = () => {
  toggleButton(document.getElementById('submit-card-details'))
  toggleButton(document.getElementById('apple-pay-payment-method-submit'))
  toggleButton(document.getElementById('google-pay-payment-method-submit'))
}

const showSpinnerAndHideMainContent = () => {
  document.getElementById('card-details-wrap').classList.add('hidden')
  const errorSummary = document.getElementById('error-summary')
  errorSummary.classList.add('hidden')
  errorSummary.setAttribute('aria-hidden', 'true')

  const paymentDetailsHeader = document.querySelector('.web-payment-button-section')
  if (typeof paymentDetailsHeader !== 'undefined' && paymentDetailsHeader !== null) {
    paymentDetailsHeader.style.display = 'none'
  }

  const applePayContainer = document.querySelector('.apple-pay-container')
  if (typeof applePayContainer !== 'undefined' && applePayContainer !== null) {
    applePayContainer.style.display = 'none'
  }

  const googlePayContainer = document.querySelector('.google-pay-container')
  if (typeof googlePayContainer !== 'undefined' && googlePayContainer !== null) {
    googlePayContainer.style.display = 'none'
  }

  document.getElementById('spinner').classList.remove('hidden')
}

const hideSpinnerAndShowMainContent = () => {
  document.getElementById('card-details-wrap').classList.remove('hidden')

  if (document.getElementsByClassName('govuk-error-summary__list')[0].childElementCount > 0) {
    const errorSummary = document.getElementById('error-summary')
    errorSummary.classList.remove('hidden')
    errorSummary.setAttribute('aria-hidden', 'false')
  }

  const paymentDetailsHeader = document.querySelector('.web-payment-button-section')
  if (typeof paymentDetailsHeader !== 'undefined' && paymentDetailsHeader !== null) {
    paymentDetailsHeader.style.display = 'block'
  }

  const applePayContainer = document.querySelector('.apple-pay-container')
  if (typeof applePayContainer !== 'undefined' && applePayContainer !== null) {
    applePayContainer.style.display = 'block'
  }

  const googlePayContainer = document.querySelector('.google-pay-container')
  if (typeof googlePayContainer !== 'undefined' && googlePayContainer !== null) {
    googlePayContainer.style.display = 'block'
  }

  document.getElementById('spinner').classList.add('hidden')
}

module.exports = {
  setGlobalChargeId,
  toggleSubmitButtons,
  showSpinnerAndHideMainContent,
  hideSpinnerAndShowMainContent,
  initialiseAddressCountryAutocomplete
}
