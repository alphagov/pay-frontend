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
  }

  autocompleteScript.setAttribute('type', 'text/javascript')
  autocompleteScript.setAttribute('src', '/public/location-autocomplete.min.js')
  document.getElementsByTagName('head')[0].appendChild(autocompleteScript)
}

module.exports = {
  setGlobalChargeId,
  initialiseAddressCountryAutocomplete
}
