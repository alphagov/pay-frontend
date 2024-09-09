/* eslint-disable no-var */
const setGlobalChargeId = () => {
  const chargeId = document.getElementById('charge-id').value
  window.chargeId = chargeId
}

const initialiseAddressCountryAutocomplete = () => {
  var autocompleteScript = document.createElement('script')

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
    button[button.hasAttribute('disabled') ? 'removeAttribute' : 'setAttribute']('disabled', 'disabled')
  }
}

const toggleSubmitButtons = () => {
  toggleButton(document.getElementById('submit-card-details'))
  toggleButton(document.getElementById('apple-pay-payment-method-submit'))
  toggleButton(document.getElementById('google-pay-payment-method-submit'))
}

const showSpinnerAndHideMainContent = () => {
  document.getElementById('card-details-wrap').classList.add('hidden')
  document.getElementById('wallet-options').classList.add('hidden')

  const errorSummary = document.getElementById('error-summary')
  errorSummary.classList.add('hidden')
  errorSummary.setAttribute('aria-hidden', 'true')

  document.getElementById('spinner').classList.remove('hidden')
}

const hideSpinnerAndShowMainContent = () => {
  document.getElementById('card-details-wrap').classList.remove('hidden')
  document.getElementById('wallet-options').classList.remove('hidden')

  if (document.getElementsByClassName('govuk-error-summary__list')[0].childElementCount > 0) {
    const errorSummary = document.getElementById('error-summary')
    errorSummary.classList.remove('hidden')
    errorSummary.setAttribute('aria-hidden', 'false')
  }

  document.getElementById('spinner').classList.add('hidden')
}

const sendLogMessage = (chargeId, logCode) => {
  return fetch(`/log/${chargeId}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      code: logCode
    })
  })
}

module.exports = {
  setGlobalChargeId,
  toggleSubmitButtons,
  showSpinnerAndHideMainContent,
  hideSpinnerAndShowMainContent,
  initialiseAddressCountryAutocomplete,
  sendLogMessage
}
