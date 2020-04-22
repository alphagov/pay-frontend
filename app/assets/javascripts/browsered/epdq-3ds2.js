'use strict'

const init = () => {
  if (window.Charge.collect_additional_browser_data_for_epdq_3ds) {
    addAdditionalInformation()
  }
}

const addAdditionalInformation = () => {
  if (typeof navigator.language === 'string') {
    appendHiddenInputToForm('jsNavigatorLanguage', navigator.language)
  }

  if (window.screen) {
    if (typeof window.screen.colorDepth === 'number') {
      appendHiddenInputToForm('jsScreenColorDepth', window.screen.colorDepth)
    }

    if (typeof window.screen.height === 'number') {
      appendHiddenInputToForm('jsScreenColorHeight', window.screen.height)
    }

    if (typeof window.screen.width === 'number') {
      appendHiddenInputToForm('jsScreenColorWidth', window.screen.width)
    }
  }

  const date = new Date()
  appendHiddenInputToForm('jsTimezoneOffsetMins', date.getTimezoneOffset())
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
