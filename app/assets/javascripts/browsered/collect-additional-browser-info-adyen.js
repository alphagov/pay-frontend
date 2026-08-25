'use strict'

const { keysToCamelCase } = require('../../../utils/key-camelizer')
const { getBrowserInfo } = require('./web-payments/helpers')

const init = () => {
  if (window.Charge.collect_additional_browser_info_adyen) {
    addAdditionalInformation()
  }
}

const addAdditionalInformation = () => {
  document.getElementById('jsEnabled').value = 'true'
  const browserInfo = keysToCamelCase(getBrowserInfo())

  for (const [key, value] of Object.entries(browserInfo)) {
    appendHiddenInputToForm(key, value)
  }
}

const appendHiddenInputToForm = (name, value) => {
  const hiddenInput = document.createElement('input')
  hiddenInput.type = 'hidden'
  hiddenInput.name = name
  hiddenInput.value = value
  document.getElementById('card-details').appendChild(hiddenInput)
}

module.exports = {
  init
}
