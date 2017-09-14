var accessibleAutocomplete = require('accessible-autocomplete')

var countryPicker = document.querySelector('#address-country')

if (countryPicker) {
  accessibleAutocomplete.enhanceSelectElement({
    selectElement: countryPicker
  })
}
